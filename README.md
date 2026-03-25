# random.airat.top

[![random.airat.top](https://raw.githubusercontent.com/AiratTop/random.airat.top/main/public_html/screenshot.png)](https://random.airat.top/)

Static, privacy-first text randomizer that runs fully in the browser with unique output (no duplicates).

Live site: https://random.airat.top
Status page: https://status.airat.top

## Features

- Full client-side generation (no server processing).
- Synonyms: `{a|b|c}`.
- Optional blocks: `{|text}`.
- Permutations: `[a|b|c]`.
- Permutations with separator: `[+,+a|b|c]`.
- Escaping: `\{`, `\}`, `\|`, `\[`, `\]`, `\+`, `\\`.
- `%rand%` placeholder for random digit `0..9`.
- Top-level `|` for paragraph shuffle.
- Batch generation request from 1 to 10,000 lines with unique output only (no duplicates).
- Output format switch: plain text, JSON array, or CSV rows.
- Copy, regenerate, and download as `.txt`, `.json`, or `.csv` based on selected format.
- Template presets and one-click template copy button.
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
