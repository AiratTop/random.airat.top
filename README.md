# random.airat.top

[![random.airat.top](https://raw.githubusercontent.com/AiratTop/random.airat.top/main/public_html/screenshot.png)](https://random.airat.top/)

Static, privacy-first text randomizer that runs fully in the browser with unique output (no duplicates).

Live site: https://random.airat.top/

Planned API repo: https://github.com/AiratTop/random.api.airat.top

## Features

- Full client-side generation (no server processing).
- Synonyms: `{a|b|c}`.
- Optional blocks: `{|text}`.
- Permutations: `[a|b|c]`.
- Permutations with separator: `[+,+a|b|c]`.
- Escaping: `\{`, `\}`, `\|`, `\[`, `\]`, `\+`, `\\`.
- `%rand%` placeholder for random digit `0..9`.
- Top-level `|` for paragraph shuffle.
- Batch generation request from 1 to 1,000 lines with unique output only (no duplicates).
- Output format switch: plain text or JSON array.
- Copy, regenerate, and download as `.txt` or `.json` based on selected format.
- Local settings persistence (template, count, output format, theme).

## What is inside

- `public_html/index.html` - layout and metadata.
- `public_html/styles.css` - theme, layout, and responsive styles.
- `public_html/app.js` - parser, generator logic, and UI wiring.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Author

**AiratTop**

- Website: [airat.top](https://airat.top)
- GitHub: [@AiratTop](https://github.com/AiratTop)
- Email: [mail@airat.top](mailto:mail@airat.top)
- Repository: [random.airat.top](https://github.com/AiratTop/random.airat.top)
