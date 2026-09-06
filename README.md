# Modelo Arranhador

Visualizador paramétrico 3D de um arranhador envolvente, construído com Svelte, Vite e A-Frame.

## Desenvolvimento

Requer Node.js 22 ou mais recente.

```bash
npm install
npm run dev
```

O servidor local é exibido no endereço informado pelo Vite.

## Validação e build

```bash
npm run check
npm run build
npm run preview
```

O build de produção é gerado em `dist/` com o caminho-base `/modelo-arranhador/`.

## Publicação

Pushes para `main` executam o workflow `Deploy index.html to GitHub Pages`. Ele instala as
dependências, gera o build do Vite e publica `dist/` no GitHub Pages.