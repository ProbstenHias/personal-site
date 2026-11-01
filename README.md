# personal-site

Source of [www.m-weilinger.de](https://www.m-weilinger.de): a Hugo site with a small custom theme (`themes/mw`), a blog and an About page.

## Run locally

```sh
hugo server
```

Then open http://localhost:1313/. Requires Hugo extended 0.168 or newer.

## Demos

The homepage shows an animated demo from the newest post that has one. A demo lives in the post's page bundle:

```
content/posts/<slug>/
  index.md     # put {{< demo >}} where the demo should appear in the post
  demo.html    # markup, root element is wrapped in [data-demo="<slug>"]
  demo.js      # behaviour, scope it to each [data-demo="<slug>"] root
  demo.css     # optional
```

Set `featured_demo: true` in a post's front matter to pin its demo to the homepage. `tests/demo.sh` checks that the demo renders on the homepage and in the post.

## Deploy

Every push to `main` builds a multi-arch image (`ghcr.io/probstenhias/personal-site:0.0.<run>`) with GitHub Actions. The image serves the static site on port 8080 with static-web-server. Renovate in [home-ops](https://github.com/ProbstenHias/home-ops) picks up the new tag and Flux rolls it out.

```sh
docker build -t personal-site .
docker run --rm -p 8080:8080 personal-site
```
