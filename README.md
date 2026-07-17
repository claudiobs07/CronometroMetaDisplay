# Cronometro para Meta Ray-Ban Display

PWA local e sem backend para cronometro geral com marcacoes de tempo parcial. A aplicacao usa HTML, CSS, TypeScript, Vite, `localStorage`, `Date.now()` para restauracao e `requestAnimationFrame` para atualizar a tela sem contar frames.

## Controles

- Enter ou Espaco: iniciar, marcar, continuar ou confirmar
- Clique no botao principal: iniciar, marcar, continuar ou confirmar
- Seta esquerda: pausar ou solicitar reinicio
- Tecla R: solicitar reinicio apenas quando pausado
- Seta direita: cancelar reinicio
- Escape: cancelar reinicio

## Como executar

```bash
npm install
npm run dev
```

## Build de producao

```bash
npm run build
```

## Testes

```bash
npm test
```

## Arquitetura

- `src/stopwatch`: tipos, estado, acoes puras, formatacao e persistencia.
- `src/input`: adaptadores de teclado, trava curta contra entradas duplicadas e ponto de integracao para os controles reais do Meta Ray-Ban Display.
- `src/ui`: renderizacao DOM da tela unica, status e ultimas tres marcacoes.
- `src/main.ts`: orquestra estado, persistencia, loop visual e eventos do navegador.

O ponto de integracao com os eventos reais do dispositivo fica em `src/input/meta-display-adapter.ts`. Quando o SDK estiver disponivel, os eventos devem chamar `onPrimaryInput`, `onLeftInput` e `onRightInput`, sem acoplar a logica do cronometro ao SDK.
