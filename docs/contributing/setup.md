---
title: Development Setup
permalink: /contributing/setup/

layout: post
sidenav: contributing
subnav:
  - text: Quickstart
    href: '#quickstart'
  - text: Fargate worker
    href: '#fargate-worker'
  - text: Documentation
    href: '#documentation'
---

## Quickstart

1.  Copy root `dev.env.example` file to a `.env` file, and change values as desired:
    - `cp dev.env.example .env`
1.  Build the crossfeed-worker Docker image
    - `cd backend && npm run build-worker`
1.  Start entire environment from root using Docker Compose
    - `docker-compose up --build`
1.  Generate DB schema:

    - `docker-compose exec backend npx sls invoke local -f syncdb`
    - (append `-d dangerouslyforce` to drop and recreate)

1.  Navigate to [localhost](http://localhost) in a browser.

1.  Hot reloading for source files is enabled, but after changes to non-source code files stopping and starting docker compose is required. The following are examples of changes that will require restarting the environment:
    - frontend or backend dependency changes
    - backend `serverless.yml` or `env.yml`
    - environment variables in root `.env`
1.  Install [Prettier](https://www.robinwieruch.de/how-to-use-prettier-vscode) in your dev environment to format code on save.

### Running the scheduler lambda function locally

The scheduler lambda function is set to run on an interval or in response to non-http events. To run it manually, run the following command:

- `docker-compose exec scheduler npx serverless invoke local -f scheduler`

### Running tests

To run tests, first make sure you have already started crossfeed with `docker-compose` . Then run:

```bash
cd backend
npm test
```

To update snapshots, run `npm test -- -u`.

## Fargate worker

In order to run scans locally or work on scanning infrastructure,
you will need to set up the Fargate worker and rebuild it periodically
when worker code changes.

### Running locally

Each time you make changes to the worker code, you should run:

```bash
npm run build-worker
```

To run the scheduler:

```bash
docker-compose exec scheduler npx serverless invoke local -f scheduler
```

You can then run `docker ps` or ( `docker ps -a | head -n 3` ) to view running / stopped Docker containers,
and check their logs with `docker logs [containername]` .

### Publishing

Run:

```bash
npm run deploy-worker
```

If the `worker_ecs_repository_url` output from Terraform changes, you will need to modify `./src/tools/deploy-worker.sh`.

### Generating censys types

To re-generate the censysIpv4 type file, run:

```bash
npm run codegen
```

## Documentation

The documentation files are stored in the `docs` directory and served from a Jekyll site. To work on this, you can run:

```bash
docker-compose up docs
```

You can then open up [http://localhost:4000][http://localhost:4000] in your browser.

See [uswds-jekyll](https://github.com/18F/uswds-jekyll) for more information on theme customizations that can be done.
