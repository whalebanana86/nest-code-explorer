/**
 * nest-code-explorer 분석기 (정적 분석, ts-morph). 앱을 띄우지 않는다.
 *   run({ cwd, configPath, svg }) → code-map.md (+ diagrams/*.svg) + code-explorer.html
 *
 * 프로젝트 규약(범위, 계층 판정, 큐 경계, SQL 관례, 에러 클래스, 외부 시스템, 출력 경로)은 전부 설정 파일에 있다.
 * 이 파일은 설정을 읽어 분석만 한다 — 다른 NestJS 프로젝트에서는 설정만 바꿔 쓴다.
 *
 * 1) 파일 import 그래프  2) 계층별 클래스 다이어그램  3) 메서드 색인
 * 4) 인터랙티브 탐색기: 진입점 → 주입 클래스, 메서드·주석·호출·테이블·에러코드·라우트·큐 경계 (vis-network 인라인, 오프라인)
 */
import { execSync } from 'child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import * as path from 'path';
import { ClassDeclaration, Project, Scope, SourceFile, SyntaxKind } from 'ts-morph';

// ---------- 설정 ----------
type LayerConfig = { name: string; match: string; column?: number; color?: string; entry?: string; skip?: boolean };
type QueueConfig =
  | { type?: 'manual-router'; namesFile: string; namesConst: string; routerClass: string }
  | { type: 'nestjs-bullmq'; processorDecorator?: string; processDecorator?: string; injectQueueDecorator?: string; addMethods?: string[] }
  | { type: 'none' };
type Config = {
  /** 탐색기 제목. 생략하면 package.json 의 name (없으면 폴더 이름) + ' · code explorer' */
  title?: string;
  /** 구조 모드 왼쪽 '폴더로 펼치기' 묶음 깊이 (src/ 를 뗀 뒤 몇 단계 폴더까지 한 묶음으로 볼지, 기본 2) */
  folderDepth: number;
  include: string[];
  exclude: string[];
  layers: LayerConfig[];
  defaultLayer: { name: string; column: number; color: string };
  importGraph: { ignoreTargets: string };
  classDiagramGroups: Record<string, string[]>;
  indexOrder: string[];
  http: { controllerDecorator: string; methodDecorators: string[]; versionDecorator: string; cronDecorator: string };
  /** 큐 경계 어댑터. manual-router: Job 이름 상수 + switch 라우터 / nestjs-bullmq: @Processor·@Process·@InjectQueue / none */
  queue: QueueConfig;
  sql: { fileSuffix: string; objectSuffix: string; tableRegex: string; ignoreTables: string[] };
  orm: { entityFileSuffix: string; entityDecorator: string; injectRepositoryDecorator: string; baseRepositoryMethods: string[] };
  errors: { className: string };
  /** terminal: 실행 경로 그림에서 말단 노드로 그릴지 (큐처럼 Job 경계로 이어지는 외부는 false) */
  externals: { match: string; label: string; terminal?: boolean }[];
  /** template / visNetwork 를 생략하면 패키지 내장 파일을 쓴다 */
  output: { template?: string; explorer: string; markdown: string; diagramsDir: string; visNetwork?: string };
};

export type RunOptions = {
  /** 프로젝트 루트 (tsconfig.json 위치, 설정의 상대 경로 기준) */
  cwd: string;
  /** 설정 파일. 생략하면 전부 기본값(NestJS 표준 관례) */
  configPath?: string;
  /** mermaid-cli 로 SVG 를 그릴지 (기본 true) */
  svg?: boolean;
  /** 이 패키지 디렉터리 (내장 템플릿 위치). 생략하면 컴파일된 파일 기준 */
  packageDir?: string;
};
export type RunResult = { explorer: string; markdown: string; classes: number };

/** 생략 가능한 섹션의 기본값 (NestJS 표준 관례) */
const CONFIG_DEFAULTS: Omit<Config, 'layers'> & { layers: LayerConfig[] } = {
  folderDepth: 2,
  include: ['src'],
  exclude: ['\\.spec\\.ts$', '\\.module\\.ts$'],
  layers: [
    { name: 'Controller', match: '\\.controller\\.ts$', column: 0, color: '#2f6fed', entry: 'HTTP (Controller)' },
    { name: 'Usecase', match: '\\.usecase\\.ts$', column: 1, color: '#7a4fd6' },
    { name: 'Service', match: '\\.service\\.ts$', column: 2, color: '#1d9a6c' },
    { name: 'Repository', match: '\\.repository\\.ts$', column: 3, color: '#b8741a' },
    { name: 'Guard', match: '\\.guard\\.ts$', column: 0, color: '#5b6b7a' },
    { name: 'Entity', match: '\\.entity\\.ts$', skip: true },
    { name: 'DTO', match: '\\.dto\\.ts$', skip: true },
    { name: 'Module', match: '\\.module\\.ts$', skip: true },
  ],
  defaultLayer: { name: 'Etc', column: 2, color: '#8a8f98' },
  importGraph: { ignoreTargets: '\\.(dto|entity|types?)\\.ts$' },
  classDiagramGroups: {},
  indexOrder: ['Controller', 'Usecase', 'Service', 'Repository', 'Guard', 'Etc'],
  http: { controllerDecorator: 'Controller', methodDecorators: ['Get', 'Post', 'Put', 'Patch', 'Delete'], versionDecorator: 'Version', cronDecorator: 'Cron' },
  queue: { type: 'none' },
  sql: { fileSuffix: '.sql.ts', objectSuffix: 'Sql', tableRegex: '\\b(?<!KEY\\s)(?:FROM|JOIN|UPDATE|INTO)\\s+`?([A-Z][A-Z0-9_]+)`?', ignoreTables: ['DUAL'] },
  orm: { entityFileSuffix: '.entity.ts', entityDecorator: 'Entity', injectRepositoryDecorator: 'InjectRepository', baseRepositoryMethods: [] },
  errors: { className: 'HttpException' },
  externals: [],
  output: { explorer: 'docs/code-explorer.html', markdown: 'docs/code-map.md', diagramsDir: 'docs/diagrams' },
};

let ROOT = process.cwd();
let PKG = path.join(__dirname, '..');
let CFG: Config;
let layerRules: (LayerConfig & { re: RegExp })[] = [];
let excludeRes: RegExp[] = [];
let ignoreImportRe = /$^/;
let tableRe = /$^/g;
let sqlObjRe = /$^/;
let externalRules: { re: RegExp; label: string; terminal: boolean }[] = [];

/** 기본 설정 사본 (--init 이 파일로 쓰고, 설정 파일이 없을 때 그대로 쓴다) */
export function defaultConfig(): Config {
  return JSON.parse(JSON.stringify(CONFIG_DEFAULTS)) as Config;
}

export type InitResult = { file: string; created: boolean };

/**
 * 기본 설정을 JSON 파일로 쓴다. 이미 있으면 force 가 아닌 한 건드리지 않는다.
 * 첫 줄 $comment 에 각 섹션의 뜻을 적어 두어 필요한 줄만 고치면 되게 한다.
 */
export function initConfig(file: string, opts: { force?: boolean } = {}): InitResult {
  if (existsSync(file) && !opts.force) return { file, created: false };
  const body = {
    $comment:
      'nest-code-explorer 설정 (npx nest-code-explorer --init 이 만든 기본값). 모든 키는 생략 가능하며 생략하면 이 값이 쓰인다. ' +
      'include/exclude: 분석 범위(루트 기준 디렉터리, 제외 정규식) · folderDepth: 구조 모드 폴더 묶음 깊이 · layers: 파일 경로 정규식 → 계층·열(column)·색·진입점 그룹(entry)·제외(skip) · ' +
      'http: 라우트/버전/cron 데코레이터 이름 · queue: 큐 경계 어댑터 type = none | nestjs-bullmq | manual-router · ' +
      'sql/orm: 테이블 추출 관례 · errors.className: new X(\'CODE\') 형태의 예외 클래스 · externals: 클래스 이름 정규식 → 외부 시스템 라벨(terminal: 말단) · ' +
      'output: 생성 경로. 정규식은 JSON 문자열이라 역슬래시를 두 번 쓴다.',
    ...defaultConfig(),
  };
  writeFileSync(file, JSON.stringify(body, null, 2) + '\n');
  return { file, created: true };
}

function loadConfig(configPath?: string): void {
  const raw: Partial<Config> = configPath ? (JSON.parse(readFileSync(configPath, 'utf8')) as Partial<Config>) : {};
  CFG = { ...CONFIG_DEFAULTS, ...raw, output: { ...CONFIG_DEFAULTS.output, ...(raw.output ?? {}) } } as Config;
  layerRules = CFG.layers.map((l) => ({ ...l, re: new RegExp(l.match) }));
  excludeRes = CFG.exclude.map((e) => new RegExp(e));
  ignoreImportRe = new RegExp(CFG.importGraph.ignoreTargets);
  tableRe = new RegExp(CFG.sql.tableRegex, 'g');
  sqlObjRe = new RegExp(`${CFG.sql.objectSuffix}$`);
  externalRules = CFG.externals.map((x) => ({ re: new RegExp(x.match), label: x.label, terminal: !!x.terminal }));
}

const rel = (f: string) => path.relative(ROOT, f).replace(/\\/g, '/');
const id = (s: string) => s.replace(/[^A-Za-z0-9_]/g, '_');
const esc = (s: string) => s.replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch] ?? ch);
/** 탐색기 제목: 설정 title → package.json name → 폴더 이름 */
function explorerTitle(): string {
  if (CFG.title) return CFG.title;
  let name = path.basename(ROOT);
  const pkgFile = path.join(ROOT, 'package.json');
  if (existsSync(pkgFile)) {
    try { name = (JSON.parse(readFileSync(pkgFile, 'utf8')) as { name?: string }).name || name; } catch { /* 이름 없으면 폴더 */ }
  }
  return `${name} · code explorer`;
}

/** 파일 경로로 계층을 정한다 (설정의 layers 순서대로 첫 매치) */
function layerOf(file: string): { name: string; skip: boolean } {
  const hit = layerRules.find((l) => l.re.test(file));
  return hit ? { name: hit.name, skip: !!hit.skip } : { name: CFG.defaultLayer.name, skip: false };
}

function main(svg: boolean): RunResult {
  const project = new Project({ tsConfigFilePath: path.join(ROOT, 'tsconfig.json') });
  const files = project
    .getSourceFiles()
    .filter((f) => CFG.include.some((d) => rel(f.getFilePath()).startsWith(d + '/')))
    .filter((f) => !excludeRes.some((re) => re.test(f.getFilePath())));
  const inScope = new Set(files.map((f) => f.getFilePath()));

  // ---------- 1) 파일 import 그래프 (폴더별 subgraph) ----------
  const byDir = new Map<string, SourceFile[]>();
  for (const f of files) {
    const dir = path.dirname(rel(f.getFilePath()));
    byDir.set(dir, [...(byDir.get(dir) ?? []), f]);
  }
  const importEdges = new Set<string>();
  for (const f of files) {
    for (const imp of f.getImportDeclarations()) {
      const target = imp.getModuleSpecifierSourceFile();
      if (!target || !inScope.has(target.getFilePath())) continue;
      if (ignoreImportRe.test(target.getFilePath())) continue; // 타입·DTO import 는 소음
      importEdges.add(`  ${id(rel(f.getFilePath()))} --> ${id(rel(target.getFilePath()))}`);
    }
  }
  const importLines = ['flowchart LR'];
  for (const [dir, list] of [...byDir.entries()].sort()) {
    importLines.push(`  subgraph ${id(dir)}["${dir}"]`);
    for (const f of list) {
      const p = rel(f.getFilePath());
      if (ignoreImportRe.test(p)) continue;
      importLines.push(`    ${id(p)}["${path.basename(p)}"]`);
    }
    importLines.push('  end');
  }
  const importsMermaid = [...importLines, ...[...importEdges].sort()].join('\n');

  // ---------- 2) 클래스 다이어그램 + 3) 메서드 색인 ----------
  type ClassInfo = { cls: ClassDeclaration; file: string; layer: string };
  const classes: ClassInfo[] = [];
  for (const f of files)
    for (const cls of f.getClasses()) {
      const file = rel(f.getFilePath());
      const layer = layerOf(file);
      if (layer.skip) continue;
      if (!cls.getName()) continue;
      classes.push({ cls, file, layer: layer.name });
    }
  const classNames = new Set(classes.map((c) => c.cls.getName()!));

  const publicMethods = (cls: ClassDeclaration) =>
    cls
      .getMethods()
      .filter((m) => m.getScope() === Scope.Public && !m.isStatic())
      .map((m) => ({ name: m.getName(), line: m.getStartLineNumber(), isAsync: m.isAsync() }));

  const injections = (cls: ClassDeclaration): string[] => {
    const ctor = cls.getConstructors()[0];
    if (!ctor) return [];
    return ctor
      .getParameters()
      .map((p) => p.getType().getSymbol()?.getName() ?? p.getTypeNode()?.getText() ?? '')
      .filter((n) => classNames.has(n));
  };

  /** 계층 묶음별 classDiagram (한 장에 다 넣으면 읽을 수 없다) */
  const groups = CFG.classDiagramGroups;
  const classDiagrams: Record<string, string> = {};
  for (const [g, prefixes] of Object.entries(groups)) {
    const own = classes.filter((c) => prefixes.some((p) => c.file.startsWith(p)));
    const lines = ['classDiagram', '  direction LR'];
    const shown = new Set<string>();
    for (const c of own) {
      const name = c.cls.getName()!;
      shown.add(name);
      lines.push(`  class ${name} {`);
      lines.push(`    <<${c.layer}>>`);
      for (const m of publicMethods(c.cls)) lines.push(`    +${m.name}()${m.isAsync ? ' async' : ''}`);
      lines.push('  }');
    }
    for (const c of own)
      for (const dep of injections(c.cls)) {
        if (!shown.has(dep)) {
          shown.add(dep);
          const layer = classes.find((x) => x.cls.getName() === dep)?.layer ?? '';
          lines.push(`  class ${dep} {\n    <<${layer} · 외부>>\n  }`);
        }
        lines.push(`  ${c.cls.getName()} --> ${dep}`);
      }
    classDiagrams[g] = lines.join('\n');
  }

  // 메서드 색인 표 (계층 → 클래스 → 메서드 file:line)
  const indexRows: string[] = ['| 계층 | 클래스 | 메서드 (file:line) |', '| --- | --- | --- |'];
  for (const layer of CFG.indexOrder)
    for (const c of classes.filter((x) => x.layer === layer).sort((a, b) => a.file.localeCompare(b.file))) {
      const ms = publicMethods(c.cls)
        .map((m) => `\`${m.name}\` ${c.file}:${m.line}`)
        .join('<br>');
      indexRows.push(`| ${layer} | \`${c.cls.getName()}\` (${c.file}:${c.cls.getStartLineNumber()}) | ${ms || '-'} |`);
    }

  // ---------- 4) 인터랙티브 탐색기 데이터 ----------
  const STR = (t?: string) => (t ?? '').replace(/^['"`]|['"`]$/g, '');
  const cleanType = (t: string) => t.replace(/import\("[^"]+"\)\./g, '').replace(/\s+/g, ' ');

  // 인터페이스 → 구현 클래스 (예: FcmProvider → RealFcmProvider, MockFcmProvider). 토큰 주입(@Inject(...)) 을 잇는다
  const implementers = new Map<string, string[]>();
  for (const c of classes)
    for (const impl of c.cls.getImplements()) {
      const name = impl.getExpression().getText();
      implementers.set(name, [...(implementers.get(name) ?? []), c.cls.getName()!]);
    }
  const isKnown = (t: string) => classNames.has(t) || implementers.has(t);

  /** 생성자 `private readonly foo: FooService` → { foo: 'FooService' } (인터페이스 타입이면 인터페이스 이름) */
  const injectedProps = (cls: ClassDeclaration): Record<string, string> => {
    const out: Record<string, string> = {};
    const ctor = cls.getConstructors()[0];
    if (!ctor) return out;
    for (const prm of ctor.getParameters()) {
      const t = prm.getType().getSymbol()?.getName() ?? prm.getTypeNode()?.getText() ?? '';
      if (isKnown(t)) out[prm.getName()] = t;
    }
    return out;
  };

  // ---------- 큐 경계 어댑터 ----------
  // jobHandlers: Job 키 → 처리 메서드, jobsOf(method, props): 메서드가 큐에 넣는 Job 키 목록
  const jobHandlers: Record<string, { cls: string; method: string }> = {};
  let jobsOf: (m: import('ts-morph').MethodDeclaration, props: Record<string, string>) => string[] = () => [];
  const qcfg = CFG.queue;
  if (!qcfg.type || qcfg.type === 'manual-router') {
    // 이 프로젝트 방식: `export const JobName = { A: 'a' } as const` + 라우터 클래스의 switch (job.name) { case JobName.A: return this.<프로세서>.<메서드>(job) }
    const jobNames: Record<string, string> = {};
    const namesFile = project.getSourceFile((f) => f.getFilePath().endsWith(qcfg.namesFile));
    const jobObj = namesFile?.getVariableDeclaration(qcfg.namesConst)?.getInitializer();
    if (jobObj?.isKind(SyntaxKind.AsExpression) || jobObj?.isKind(SyntaxKind.ObjectLiteralExpression)) {
      const lit = jobObj.isKind(SyntaxKind.AsExpression) ? jobObj.getExpression() : jobObj;
      if (lit.isKind(SyntaxKind.ObjectLiteralExpression))
        for (const p of lit.getProperties())
          if (p.isKind(SyntaxKind.PropertyAssignment)) jobNames[p.getName()] = STR(p.getInitializer()?.getText());
    }
    const router = classes.find((c) => c.cls.getName() === qcfg.routerClass);
    if (router) {
      const props = injectedProps(router.cls);
      for (const cc of router.cls.getDescendantsOfKind(SyntaxKind.CaseClause)) {
        const expr = cc.getExpression();
        if (!expr.isKind(SyntaxKind.PropertyAccessExpression) || expr.getExpression().getText() !== qcfg.namesConst) continue;
        const job = jobNames[expr.getName()];
        const call = cc.getDescendantsOfKind(SyntaxKind.CallExpression).find((k) => /^this\.\w+\.\w+$/.test(k.getExpression().getText()));
        const [, prop, method] = call?.getExpression().getText().match(/^this\.(\w+)\.(\w+)$/) ?? [];
        if (job && prop && props[prop]) jobHandlers[job] = { cls: props[prop], method };
      }
    }
    jobsOf = (m) => {
      const out = new Set<string>();
      for (const pa of m.getDescendantsOfKind(SyntaxKind.PropertyAccessExpression))
        if (pa.getExpression().getText() === qcfg.namesConst && jobNames[pa.getName()]) out.add(jobNames[pa.getName()]);
      return [...out];
    };
  } else if (qcfg.type === 'nestjs-bullmq') {
    // @nestjs/bullmq (WorkerHost.process) 와 @nestjs/bull (@Process('name')) 공통:
    //   핸들러 = @Processor('queue') 클래스의 process() 또는 @Process('name') 메서드 → 키 'queue' 또는 'queue/name'
    //   생산   = @InjectQueue('queue') 로 주입된 프로퍼티의 .add('name', …) / .addBulk(…)
    const procDeco = qcfg.processorDecorator ?? 'Processor';
    const processDeco = qcfg.processDecorator ?? 'Process';
    const injectDeco = qcfg.injectQueueDecorator ?? 'InjectQueue';
    const addMethods = qcfg.addMethods ?? ['add', 'addBulk'];
    const queueNameOf = (argText?: string) => {
      if (!argText) return '';
      const named = argText.match(/name\s*:\s*['"`]([^'"`]+)['"`]/);
      return named ? named[1] : STR(argText);
    };
    for (const c of classes) {
      const d = c.cls.getDecorator(procDeco);
      if (!d) continue;
      const q = queueNameOf(d.getArguments()[0]?.getText());
      if (!q) continue;
      let any = false;
      for (const m of c.cls.getMethods()) {
        const pd = m.getDecorator(processDeco);
        if (!pd) continue;
        any = true;
        const name = queueNameOf(pd.getArguments()[0]?.getText());
        jobHandlers[name ? `${q}/${name}` : q] = { cls: c.cls.getName()!, method: m.getName() };
      }
      if (!any && c.cls.getMethod('process')) jobHandlers[q] = { cls: c.cls.getName()!, method: 'process' };
    }
    const queueProps = new Map<ClassDeclaration, Record<string, string>>();
    const propsOf = (cls: ClassDeclaration) => {
      if (!queueProps.has(cls)) {
        const out: Record<string, string> = {};
        for (const prm of cls.getConstructors()[0]?.getParameters() ?? []) {
          const d = prm.getDecorator(injectDeco);
          if (d) out[prm.getName()] = queueNameOf(d.getArguments()[0]?.getText());
        }
        queueProps.set(cls, out);
      }
      return queueProps.get(cls)!;
    };
    jobsOf = (m) => {
      const out = new Set<string>();
      const qp = propsOf(m.getParentOrThrow() as ClassDeclaration);
      for (const call of m.getDescendantsOfKind(SyntaxKind.CallExpression)) {
        const expr = call.getExpression();
        if (!expr.isKind(SyntaxKind.PropertyAccessExpression) || !addMethods.includes(expr.getName())) continue;
        const obj = expr.getExpression();
        if (!obj.isKind(SyntaxKind.PropertyAccessExpression) || obj.getExpression().getKind() !== SyntaxKind.ThisKeyword) continue;
        const q = qp[obj.getName()];
        if (!q) continue;
        const first = call.getArguments()[0];
        const name = first?.isKind(SyntaxKind.StringLiteral) ? first.getLiteralValue() : null;
        out.add(name && jobHandlers[`${q}/${name}`] ? `${q}/${name}` : q);
      }
      return [...out];
    };
  }

  // SQL 파일: 쿼리 이름 → 테이블
  const sqlTables: Record<string, string[]> = {};
  for (const f of project.getSourceFiles().filter((x) => x.getFilePath().endsWith(CFG.sql.fileSuffix)))
    for (const v of f.getVariableDeclarations()) {
      const init = v.getInitializer();
      if (!init?.isKind(SyntaxKind.ObjectLiteralExpression)) continue;
      for (const p of init.getProperties()) {
        if (!p.isKind(SyntaxKind.MethodDeclaration)) continue;
        const tables = new Set<string>();
        for (const mm of p.getText().matchAll(tableRe)) if (!CFG.sql.ignoreTables.includes(mm[1])) tables.add(mm[1]);
        sqlTables[`${v.getName()}.${p.getName()}`] = [...tables];
      }
    }

  // Repository → 엔티티 테이블 (@InjectRepository(XEntity) → @Entity('TABLE'))
  const entityTable: Record<string, string> = {};
  for (const f of project.getSourceFiles().filter((x) => x.getFilePath().endsWith(CFG.orm.entityFileSuffix)))
    for (const c of f.getClasses()) {
      const d = c.getDecorator(CFG.orm.entityDecorator);
      if (d && c.getName()) entityTable[c.getName()!] = STR(d.getArguments()[0]?.getText()) || c.getName()!;
    }
  const repoTable = (cls: ClassDeclaration): string | null => {
    for (const prm of cls.getConstructors()[0]?.getParameters() ?? []) {
      const d = prm.getDecorator(CFG.orm.injectRepositoryDecorator);
      if (d) return entityTable[d.getArguments()[0]?.getText() ?? ''] ?? null;
    }
    return null;
  };
  const BASE_REPO_METHODS = CFG.orm.baseRepositoryMethods;
  const externalRule = (name: string) => externalRules.find((x) => x.re.test(name));
  const externalOf = (name: string) => externalRule(name)?.label ?? null;
  const externalTerminal = (name: string) => !!externalRule(name)?.terminal;

  const HTTP = CFG.http.methodDecorators;
  const explorerClasses = classes.map((c) => {
    const props = injectedProps(c.cls);
    const ctrl = c.cls.getDecorator(CFG.http.controllerDecorator);
    const ctrlPrefix = ctrl ? STR(ctrl.getArguments()[0]?.getText()) : null;
    const table = c.layer === 'Repository' ? repoTable(c.cls) : null;
    const methods = c.cls
      .getMethods()
      .filter((m) => !m.isStatic())
      .map((m) => {
        // this.<주입필드>.<메서드>( 호출 → 이 함수가 부르는 다른 클래스의 함수
        const calls = new Map<string, { cls: string; method: string }>();
        const sql = new Set<string>();
        const jobs = new Set<string>();
        const errors = new Set<string>();
        for (const call of m.getDescendantsOfKind(SyntaxKind.CallExpression)) {
          const expr = call.getExpression();
          if (!expr.isKind(SyntaxKind.PropertyAccessExpression)) continue;
          const obj = expr.getExpression();
          if (obj.isKind(SyntaxKind.PropertyAccessExpression) && obj.getExpression().getKind() === SyntaxKind.ThisKeyword) {
            const target = props[obj.getName()];
            if (target) calls.set(`${target}.${expr.getName()}`, { cls: target, method: expr.getName() });
          } else if (obj.isKind(SyntaxKind.Identifier) && sqlObjRe.test(obj.getText())) {
            sql.add(`${obj.getText()}.${expr.getName()}`);
          } else if (obj.getKind() === SyntaxKind.ThisKeyword && c.layer === 'Repository' && BASE_REPO_METHODS.includes(expr.getName())) {
            sql.add('__entity__');
          }
        }
        for (const j of jobsOf(m, props)) jobs.add(j);
        for (const ne of m.getDescendantsOfKind(SyntaxKind.NewExpression))
          if (ne.getExpression().getText() === CFG.errors.className) { const a = ne.getArguments()[0]; if (a?.isKind(SyntaxKind.StringLiteral)) errors.add(a.getLiteralValue()); }
        const tables = new Set<string>();
        for (const q of sql) { if (q === '__entity__') { if (table) tables.add(table); } else for (const t of sqlTables[q] ?? []) tables.add(t); }
        const http = m.getDecorators().find((d) => HTTP.includes(d.getName()));
        const version = m.getDecorator(CFG.http.versionDecorator)?.getArguments()[0]?.getText();
        const route = http && ctrlPrefix !== null
          ? { method: http.getName().toUpperCase(), path: '/' + [version && /^['"]/.test(version) ? `v${STR(version)}` : null, ctrlPrefix, STR(http.getArguments()[0]?.getText())].filter(Boolean).join('/').replace(/\/+/g, '/') }
          : null;
        const cronArg = m.getDecorator(CFG.http.cronDecorator)?.getArguments()[0]?.getText();
        const cron = cronArg ? (cronArg.match(/'([^']+)'/)?.[1] ?? cronArg) : null;
        return {
          name: m.getName(),
          line: m.getStartLineNumber(),
          isAsync: m.isAsync(),
          scope: m.getScope(),
          description: m.getJsDocs()[0]?.getDescription().trim() ?? '',
          params: m.getParameters().map((x) => `${x.getName()}${x.isOptional() ? '?' : ''}: ${cleanType(x.getType().getText(x))}`),
          returnType: cleanType(m.getReturnType().getText(m)),
          calls: [...calls.values()],
          sql: [...sql].filter((q) => q !== '__entity__'),
          tables: [...tables],
          jobs: [...jobs],
          errors: [...errors],
          route,
          cron,
        };
      });
    const doc = c.cls.getJsDocs()[0]?.getDescription().trim() ?? '';
    return {
      name: c.cls.getName()!,
      layer: c.layer,
      file: c.file,
      line: c.cls.getStartLineNumber(),
      description: doc,
      deps: [...new Set(Object.values(props))],
      table,
      external: externalOf(c.cls.getName()!),
      externalTerminal: externalTerminal(c.cls.getName()!),
      methods,
    };
  });
  // 인터페이스를 가상 클래스로: 메서드는 시그니처, deps 는 구현체 → 그래프가 구현체로 이어진다
  for (const [iface, impls] of implementers) {
    const decl = project.getSourceFiles().flatMap((f) => f.getInterfaces()).find((i) => i.getName() === iface);
    if (!decl) continue;
    explorerClasses.push({
      name: iface, layer: 'Service', file: rel(decl.getSourceFile().getFilePath()), line: decl.getStartLineNumber(),
      description: (decl.getJsDocs()[0]?.getDescription().trim() ?? '') + ` (인터페이스 · 구현: ${impls.join(', ')})`,
      deps: impls, table: null, external: externalOf(iface), externalTerminal: externalTerminal(iface),
      methods: decl.getMethods().map((m) => ({
        name: m.getName(), line: m.getStartLineNumber(), isAsync: false, scope: Scope.Public, description: m.getJsDocs()[0]?.getDescription().trim() ?? '',
        params: m.getParameters().map((x) => `${x.getName()}: ${cleanType(x.getType().getText(x))}`), returnType: cleanType(m.getReturnType().getText(m)),
        calls: impls.map((i) => ({ cls: i, method: m.getName() })), sql: [], tables: [], jobs: [], errors: [], route: null, cron: null,
      })),
    });
  }
  // 화면이 쓰는 계층 정보 (열·색·진입점 그룹명) 도 설정에서 넘긴다 → 템플릿에 프로젝트 이름이 남지 않는다
  const uiLayers = [
    ...layerRules.filter((l) => !l.skip).map((l) => ({ name: l.name, column: l.column ?? CFG.defaultLayer.column, color: l.color ?? CFG.defaultLayer.color, entry: l.entry ?? null })),
    { name: CFG.defaultLayer.name, column: CFG.defaultLayer.column, color: CFG.defaultLayer.color, entry: null },
  ];
  const explorerData = { generatedAt: new Date().toISOString(), root: ROOT, folderDepth: CFG.folderDepth, layers: uiLayers, classes: explorerClasses, jobHandlers, baseRepoMethods: BASE_REPO_METHODS };
  const visPath = CFG.output.visNetwork ? path.join(ROOT, CFG.output.visNetwork) : require.resolve('vis-network/standalone/umd/vis-network.min.js');
  const templatePath = CFG.output.template ? path.join(ROOT, CFG.output.template) : path.join(PKG, 'template/code-explorer.template.html');
  const visJs = readFileSync(visPath, 'utf8');
  const explorerHtml = readFileSync(templatePath, 'utf8')
    .replace('__VIS__', () => visJs)
    .replace(/__TITLE__/g, () => esc(explorerTitle()))
    .replace('__DATA__', () => JSON.stringify(explorerData));
  const explorerOut = path.join(ROOT, CFG.output.explorer);
  mkdirSync(path.dirname(explorerOut), { recursive: true });
  writeFileSync(explorerOut, explorerHtml);
  console.log(`explorer: ${explorerClasses.length} classes → ${CFG.output.explorer}`);

  // ---------- 출력 ----------
  const md = `# 코드 지도 (자동 생성)

\`npm run graph:code\` 가 ts-morph 로 소스를 정적 분석해 만든다. 코드가 바뀌면 다시 실행한다. 범위: \`${CFG.include.join('`, `')}\` (spec·module 파일 제외). 모듈 단위 의존은 [di-graph.md](di-graph.md), 요청이 어떤 순서로 처리되는지는 [worker-flow.md](worker-flow.md).

## 1. 파일 import 그래프

어떤 파일이 어떤 파일을 import 하는지. 폴더가 subgraph 다. DTO·Entity·타입 파일로 가는 화살표는 소음이라 뺐다.

![code-imports](diagrams/code-imports.svg)

\`\`\`mermaid
${importsMermaid}
\`\`\`

## 2. 클래스와 메서드 (묶음별)

상자 하나가 클래스, 안의 줄이 public 메서드, 화살표가 생성자 주입이다. 회색 \`<<외부>>\` 는 다른 묶음의 클래스다.

${Object.keys(groups)
  .map(
    (g) => `### ${g}

![code-classes-${g}](diagrams/code-classes-${g}.svg)

\`\`\`mermaid
${classDiagrams[g]}
\`\`\`
`,
  )
  .join('\n')}
## 3. 메서드 색인

함수 이름으로 검색해 파일과 줄 번호를 찾는다.

${indexRows.join('\n')}
`;
  const markdownOut = path.join(ROOT, CFG.output.markdown);
  const diagramsDir = path.join(ROOT, CFG.output.diagramsDir);
  mkdirSync(path.dirname(markdownOut), { recursive: true });
  mkdirSync(diagramsDir, { recursive: true });
  writeFileSync(markdownOut, md);
  writeFileSync(path.join(diagramsDir, 'code-imports.mmd'), importsMermaid);
  for (const [g, m] of Object.entries(classDiagrams)) writeFileSync(path.join(diagramsDir, `code-classes-${g}.mmd`), m);
  console.log(`files=${files.length} importEdges=${importEdges.size} classes=${classes.length} → ${CFG.output.markdown}`);

  if (svg) {
    for (const f of ['code-imports', ...Object.keys(groups).map((g) => `code-classes-${g}`)]) {
      const base = path.join(diagramsDir, f);
      try {
        execSync(`npx -y @mermaid-js/mermaid-cli@11 -i ${base}.mmd -o ${base}.svg -b white`, { stdio: 'inherit', cwd: ROOT });
      } catch {
        console.warn(`svg render skipped: ${f}`);
      }
    }
  }
  return { explorer: explorerOut, markdown: markdownOut, classes: explorerClasses.length };
}

/** 설정을 읽고 분석·생성을 수행한다 (CLI 와 프로그램 양쪽에서 호출) */
export function run(opts: RunOptions): RunResult {
  ROOT = opts.cwd;
  if (opts.packageDir) PKG = opts.packageDir;
  loadConfig(opts.configPath);
  return main(opts.svg !== false);
}
