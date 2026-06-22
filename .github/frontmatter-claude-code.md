# Frontmatter en Claude Code: referencia completa de campos y opciones

En Claude Code hay **dos sistemas de archivos con frontmatter YAML** que la gente suele confundir:

1. **Subagentes** — archivos en `.claude/agents/<nombre>.md` o `~/.claude/agents/<nombre>.md`. Definen asistentes de IA especializados con su propio contexto, herramientas y permisos.
2. **Skills (y comandos slash)** — archivos en `.claude/skills/<nombre>/SKILL.md` o `.claude/commands/<nombre>.md`. Los comandos slash personalizados se fusionaron con las skills: un archivo en `.claude/commands/deploy.md` y una skill en `.claude/skills/deploy/SKILL.md` crean ambos `/deploy` y funcionan igual.

Cada sistema tiene su propio conjunto de campos. Este documento cubre los dos por separado, con todas las opciones de cada campo según la documentación oficial.

---

## Parte 1: Frontmatter de subagentes

Archivos en `.claude/agents/` (proyecto), `~/.claude/agents/` (usuario), o pasados por el flag `--agents` como JSON. Solo `name` y `description` son obligatorios.

### Ejemplo mínimo

```markdown
---
name: code-reviewer
description: Reviews code for quality and best practices
tools: Read, Glob, Grep
model: sonnet
---

You are a code reviewer. When invoked, analyze the code and provide
specific, actionable feedback on quality, security, and best practices.
```

El cuerpo en Markdown (debajo del frontmatter) se convierte en el system prompt del subagente.

### Tabla de campos

| Campo | Obligatorio | Descripción |
|---|---|---|
| `name` | Sí | Identificador único en minúsculas con guiones. Los hooks lo reciben como `agent_type`. El nombre del archivo no tiene por qué coincidir. |
| `description` | Sí | Cuándo debe Claude delegar a este subagente. Es el campo clave para la delegación automática. |
| `tools` | No | Herramientas que el subagente puede usar (allowlist). Si se omite, hereda todas las del hilo principal. |
| `disallowedTools` | No | Herramientas a denegar (denylist), restadas de las heredadas o especificadas. |
| `model` | No | Modelo a usar. Por defecto `inherit`. |
| `permissionMode` | No | Modo de permisos. Ignorado en subagentes de plugin. |
| `maxTurns` | No | Número máximo de turnos agénticos antes de que el subagente pare. |
| `skills` | No | Skills a precargar en el contexto del subagente al arrancar (se inyecta el contenido completo). |
| `mcpServers` | No | Servidores MCP disponibles para este subagente. Ignorado en subagentes de plugin. |
| `hooks` | No | Hooks de ciclo de vida acotados a este subagente. Ignorado en subagentes de plugin. |
| `memory` | No | Ámbito de memoria persistente para aprendizaje entre sesiones. |
| `background` | No | `true` para ejecutar siempre como tarea en segundo plano. Por defecto `false`. |
| `effort` | No | Nivel de esfuerzo cuando este subagente está activo. Sobrescribe el de la sesión. |
| `isolation` | No | `worktree` para ejecutar en un git worktree temporal aislado. |
| `color` | No | Color de visualización en la lista de tareas y el transcript. |
| `initialPrompt` | No | Se auto-envía como primer turno de usuario cuando el agente corre como sesión principal (vía `--agent`). |

### Opciones detalladas por campo

**`model`** — controla qué modelo usa el subagente. Opciones:
- Alias de modelo: `sonnet`, `opus`, `haiku` o `fable`
- ID completo del modelo: por ejemplo `claude-opus-4-8` o `claude-sonnet-4-6` (acepta los mismos valores que el flag `--model`)
- `inherit`: usa el mismo modelo que la conversación principal
- Omitido: por defecto es `inherit`

Orden de resolución del modelo (de mayor a menor prioridad): primero la variable de entorno `CLAUDE_CODE_SUBAGENT_MODEL` si está definida; luego el parámetro `model` de la invocación concreta; luego el `model` del frontmatter; por último el modelo de la conversación principal.

**`permissionMode`** — controla cómo maneja el subagente los prompts de permiso. Opciones:
- `default`: comprobación de permisos estándar con prompts
- `acceptEdits`: auto-acepta ediciones de archivos y comandos comunes del sistema de archivos para rutas en el directorio de trabajo o `additionalDirectories`
- `auto`: un clasificador en segundo plano revisa comandos y escrituras en directorios protegidos
- `dontAsk`: auto-deniega los prompts de permiso (las herramientas explícitamente permitidas siguen funcionando)
- `bypassPermissions`: omite los prompts de permiso (usar con precaución)
- `plan`: modo plan (exploración de solo lectura)

Nota: si el padre usa `bypassPermissions` o `acceptEdits`, eso tiene precedencia y no se puede sobrescribir. Si el padre usa modo `auto`, el subagente lo hereda y su `permissionMode` del frontmatter se ignora.

**`memory`** — ámbito de la memoria persistente. Opciones:
- `user`: en `~/.claude/agent-memory/<nombre-del-agente>/` — para recordar entre todos los proyectos
- `project`: en `.claude/agent-memory/<nombre-del-agente>/` — específico del proyecto y compartible vía control de versiones (es el ámbito recomendado por defecto)
- `local`: en `.claude/agent-memory-local/<nombre-del-agente>/` — específico del proyecto pero que no debe subirse al control de versiones

**`effort`** — nivel de esfuerzo. Opciones: `low`, `medium`, `high`, `xhigh`, `max`. Los niveles disponibles dependen del modelo.

**`color`** — color de visualización. Opciones: `red`, `blue`, `green`, `yellow`, `purple`, `orange`, `pink`, `cyan`.

**`isolation`** — solo acepta el valor `worktree`, que ejecuta el subagente en un git worktree temporal con una copia aislada del repositorio, ramificada por defecto desde tu rama por defecto. El worktree se limpia automáticamente si el subagente no hace cambios.

**`background`** — `true` o `false` (por defecto `false`).

### Detalles sobre `tools`

Los subagentes heredan las herramientas internas y MCP de la conversación principal por defecto. Estas herramientas dependen de la UI o el estado de sesión y **no** están disponibles para subagentes aunque las listes: `AskUserQuestion`, `EnterPlanMode`, `ExitPlanMode` (salvo que el `permissionMode` sea `plan`), `ScheduleWakeup`, `WaitForMcpServers`.

Si pones tanto `tools` como `disallowedTools`, primero se aplica `disallowedTools` y luego `tools` se resuelve sobre lo que queda. Una herramienta listada en ambos se elimina.

Para restringir qué subagentes puede lanzar un agente que corre como hilo principal, usa la sintaxis `Agent(tipo1, tipo2)` en `tools`. Por ejemplo `tools: Agent(worker, researcher), Read, Bash` solo permite lanzar `worker` y `researcher`. Usar `Agent` sin paréntesis permite lanzar cualquiera; omitir `Agent` impide lanzar subagentes.

### Aviso importante sobre subagentes de plugin

Por razones de seguridad, los subagentes de plugin **no** soportan los campos `hooks`, `mcpServers` ni `permissionMode`. Esos campos se ignoran al cargar agentes desde un plugin.

---

## Parte 2: Frontmatter de skills y comandos slash

Archivos `SKILL.md` en `.claude/skills/<nombre>/` o `~/.claude/skills/<nombre>/`, y archivos `.md` en `.claude/commands/`. Todos los campos son opcionales; solo `description` es recomendable.

### Ejemplo mínimo

```yaml
---
name: my-skill
description: What this skill does
disable-model-invocation: true
allowed-tools: Read Grep
---

Your skill instructions here...
```

### Tabla de campos

| Campo | Obligatorio | Descripción |
|---|---|---|
| `name` | No | Nombre de visualización en los listados. Por defecto, el nombre del directorio. |
| `description` | Recomendado | Qué hace la skill y cuándo usarla. Claude lo usa para decidir cuándo aplicarla. |
| `when_to_use` | No | Contexto adicional sobre cuándo invocarla (frases gatillo, ejemplos). Se añade a `description`. |
| `argument-hint` | No | Pista mostrada durante el autocompletado para indicar los argumentos esperados. |
| `arguments` | No | Argumentos posicionales con nombre para sustitución `$nombre` en el contenido. |
| `disable-model-invocation` | No | `true` para impedir que Claude la cargue automáticamente. Por defecto `false`. |
| `user-invocable` | No | `false` para ocultarla del menú `/`. Por defecto `true`. |
| `allowed-tools` | No | Herramientas que Claude puede usar sin pedir permiso mientras la skill está activa. |
| `disallowed-tools` | No | Herramientas eliminadas del conjunto disponible mientras la skill está activa. |
| `model` | No | Modelo a usar mientras la skill está activa. |
| `effort` | No | Nivel de esfuerzo mientras la skill está activa. |
| `context` | No | `fork` para ejecutar en un contexto de subagente bifurcado. |
| `agent` | No | Qué tipo de subagente usar cuando `context: fork` está activado. |
| `hooks` | No | Hooks acotados al ciclo de vida de esta skill. |
| `paths` | No | Patrones glob que limitan cuándo se activa la skill automáticamente. |
| `shell` | No | Shell para los comandos `` !`comando` ``. |

### Opciones detalladas por campo

**`disable-model-invocation`** — `true` o `false` (por defecto `false`). Con `true`, solo tú puedes invocarla con `/nombre`; Claude no la carga sola. Útil para flujos con efectos secundarios como `/commit` o `/deploy`. También impide que la skill se precargue en subagentes.

**`user-invocable`** — `true` o `false` (por defecto `true`). Con `false`, solo Claude puede invocarla y se oculta del menú `/`. Útil para conocimiento de fondo que no es una acción ejecutable por el usuario.

Combinación de los dos campos anteriores:

| Frontmatter | Tú puedes invocar | Claude puede invocar |
|---|---|---|
| (por defecto) | Sí | Sí |
| `disable-model-invocation: true` | Sí | No |
| `user-invocable: false` | No | Sí |

**`model`** — acepta los mismos valores que el comando `/model`, o `inherit` para mantener el modelo activo. La sobrescritura aplica durante el resto del turno actual y no se guarda en los ajustes; el modelo de sesión vuelve en tu siguiente prompt.

**`effort`** — opciones: `low`, `medium`, `high`, `xhigh`, `max`. Los niveles disponibles dependen del modelo. Sobrescribe el nivel de esfuerzo de la sesión.

**`context`** — solo acepta el valor `fork`, que ejecuta la skill en un subagente aislado. El contenido de la skill se convierte en el prompt que dirige al subagente; no tiene acceso al historial de la conversación. Solo tiene sentido para skills con instrucciones explícitas (una tarea), no para skills de solo directrices.

**`agent`** — qué configuración de subagente usar cuando `context: fork` está activado. Opciones: agentes integrados (`Explore`, `Plan`, `general-purpose`) o cualquier subagente personalizado de `.claude/agents/`. Si se omite, usa `general-purpose`.

**`shell`** — opciones: `bash` (por defecto) o `powershell`. Poner `powershell` ejecuta los comandos shell en línea vía PowerShell en Windows. Requiere `CLAUDE_CODE_USE_POWERSHELL_TOOL=1`.

**`allowed-tools` / `disallowed-tools`** — aceptan una cadena separada por espacios o comas, o una lista YAML. `allowed-tools` concede permiso para esas herramientas mientras la skill está activa (no restringe las demás). `disallowed-tools` las elimina del conjunto disponible; la restricción se limpia en tu siguiente mensaje. Ejemplo con patrones: `allowed-tools: Bash(git add *) Bash(git commit *) Bash(git status *)`.

**`paths`** — patrones glob (cadena separada por comas o lista YAML). Cuando se define, Claude carga la skill automáticamente solo al trabajar con archivos que coincidan con los patrones. Usa el mismo formato que las reglas específicas por ruta de la memoria.

**`arguments`** — argumentos posicionales con nombre. Acepta una cadena separada por espacios o una lista YAML. Los nombres se mapean a posiciones en orden: con `arguments: [issue, branch]`, el placeholder `$issue` se expande al primer argumento y `$branch` al segundo.

### Paso de argumentos (placeholders del cuerpo)

`argument-hint` solo es texto de ayuda en el autocompletado; **no** pasa parámetros. Quien pasa los valores son los placeholders dentro del cuerpo de la skill:

| Variable | Descripción |
|---|---|
| `$ARGUMENTS` | Todos los argumentos pasados al invocar. Si no aparece en el contenido, se añaden como `ARGUMENTS: <valor>`. |
| `$ARGUMENTS[N]` | Argumento concreto por índice base-0, por ejemplo `$ARGUMENTS[0]` para el primero. |
| `$N` | Forma corta de `$ARGUMENTS[N]`, por ejemplo `$0` para el primero, `$1` para el segundo. |
| `$nombre` | Argumento con nombre declarado en la lista `arguments` del frontmatter. |
| `${CLAUDE_SESSION_ID}` | El ID de la sesión actual. |
| `${CLAUDE_EFFORT}` | El nivel de esfuerzo actual: `low`, `medium`, `high`, `xhigh` o `max`. |
| `${CLAUDE_SKILL_DIR}` | El directorio que contiene el `SKILL.md` de la skill. |

Los argumentos indexados usan comillas al estilo shell: envuelve valores de varias palabras entre comillas para pasarlos como uno solo. `/mi-skill "hello world" second` hace que `$0` sea `hello world` y `$1` sea `second`. El placeholder `$ARGUMENTS` siempre se expande a toda la cadena de argumentos tal como se escribió.

Para incluir un `$` literal antes de un dígito, de `ARGUMENTS` o de un nombre de argumento, escápalo con barra invertida: `\$1.00`.

### Inyección de contexto dinámico

La sintaxis `` !`<comando>` `` ejecuta comandos shell antes de enviar el contenido de la skill a Claude; la salida del comando reemplaza el placeholder. El `!` en línea solo se reconoce al principio de una línea o justo después de un espacio. Para comandos multilínea, usa un bloque de código abierto con ` ```! `.

---

## Diferencias clave entre los dos sistemas

| Aspecto | Subagentes | Skills / comandos |
|---|---|---|
| Ubicación | `.claude/agents/*.md` | `.claude/skills/<n>/SKILL.md` o `.claude/commands/*.md` |
| Campos obligatorios | `name` y `description` | ninguno (`description` recomendado) |
| Campo de modelo | `model` (alias incl. `fable`, ID completo, o `inherit`; por defecto `inherit`) | `model` (valores de `/model` o `inherit`) |
| Permisos | `permissionMode` (6 modos) | `allowed-tools` / `disallowed-tools` |
| Argumentos | en lenguaje natural al delegar (sin placeholders) | placeholders `$ARGUMENTS`, `$N`, `$nombre` |
| `argument-hint` | no aplica | sí (solo ayuda de autocompletado) |
| Contexto | aislado por defecto (o `isolation: worktree`) | en línea por defecto (o `context: fork`) |
| Ayuda de ayuda visual | `color` | — |

> Nota práctica: el `argument-hint` y el paso de parámetros pertenecen al sistema de **skills/comandos**, no a los subagentes. Si querías pasar parámetros, es muy probable que estés escribiendo un comando slash, no un subagente.

---

*Fuente: documentación oficial de Claude Code (code.claude.com/docs), páginas de subagentes y de skills, consultadas en junio de 2026. Verifica contra la documentación oficial, ya que estos formatos evolucionan.*
