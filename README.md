# skills

A personal collection of agent skills. Each skill is a folder under `skills/` with a `SKILL.md` entry point and the reference files it loads on demand.

## Install

Install every skill in this repo:

```bash
npx skills add ericzakariasson/skills
```

Install a single skill:

```bash
npx skills add ericzakariasson/skills --skill game-demo-production
```

List the available skills without installing anything:

```bash
npx skills add ericzakariasson/skills --list
```

## Skills

- `game-demo-production`: builds playable homage game demos through a planner, builder, and critic loop that repeats until in-game captures hold up next to real shipped-game screenshots.
- `game-demo-blender-assets`: companion for 3D demos that authors hero characters and other camera-critical meshes in Blender and exports GLB, one asset per specialist subagent.

## License

MIT. See the `LICENSE` file.
