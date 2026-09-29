# Movie Universe

A cinematic 3D sphere of movie stills. Drag, scroll, or use the arrow keys to spin the ball. Hover a poster on the front to read its title and a short line from the film.

## Live demo

[https://3-d-movie-sphere-with-next-js-gsap.vercel.app/](https://3-d-movie-sphere-with-next-js-gsap.vercel.app/)

## What it does

Twenty posters sit on evenly spaced points around a sphere. A rotation matrix remembers the spin, and every frame the cards are projected into place: nearer ones stay bright, farther ones dim. The first drag or scroll hides the hint. Hovering a front card lifts it and opens a story popup.

Posters live in `public/movie universe`. Titles and descriptions live in `app/movies.ts`. The sphere itself is `app/components/card-sphere.tsx`, animated with GSAP.

## Run it locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).
