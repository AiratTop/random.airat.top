const RANDOM_LIMITS = {
  countMin: 1,
  countMax: 1000,
};

const THEMES = new Set(["auto", "light", "dark"]);
const OUTPUT_FORMATS = new Set(["text", "json"]);

const STORAGE_KEY = "random-airat-top-settings-v1";
const OUTPUT_SEPARATOR = "\n\n";
const RAND_TOKEN = "%rand%";

const DEFAULT_TEMPLATE = `{{Some|Many|There is a} belief|{Some|Many} think} that
[+ and +
  {copywriting|writing texts|copywriting (writing texts)}
| {rewriting|reworking texts|rewriting (reworking texts)}
] [{|can successfully}|can] be entrusted to
[+ - + {a text randomizer|a randomizer of {texts|content}} | a {special|dedicated} {program|tool}].`;

const DEFAULTS = {
  count: 3,
  template: DEFAULT_TEMPLATE,
  theme: "auto",
  outputFormat: "text",
};

const ui = {
  reset: document.querySelector("#resetDefaults"),
  template: document.querySelector("#templateInput"),
  output: document.querySelector("#randomOutput"),
  outputWrap: document.querySelector("#randomOutputWrap"),
  count: document.querySelector("#randomCount"),
  refresh: document.querySelector("#randomRefresh"),
  copy: document.querySelector("#randomCopy"),
  download: document.querySelector("#randomDownload"),
  downloadLabel: document.querySelector("#downloadLabel"),
  status: document.querySelector("#randomStatus"),
  variantCount: document.querySelector("#variantCount"),
  generatedCount: document.querySelector("#generatedCount"),
  outputFormatButtons: Array.from(document.querySelectorAll("[data-output-format]")),
  themeButtons: Array.from(document.querySelectorAll("[data-theme]")),
};

const state = {
  messageTimers: new Map(),
  outputList: [],
  theme: "auto",
  outputFormat: "text",
  inputTimer: null,
};

class ParseNode {
  constructor(parent = null) {
    this.parent = parent;
    this.text = "";
    this.type = "mixing";
    this.subNodes = [];
    this.usedIndexes = [];
    this.separator = "";
    this.isSeparator = false;

    if (parent) {
      parent.subNodes.push(this);
    }
  }

  setType(type) {
    if (type === "string" || type === "synonyms" || type === "series") {
      this.type = type;
      return;
    }
    this.type = "mixing";
  }

  concat(str) {
    const value = String(str);

    if (this.isSeparator) {
      this.separator += value;
      return this;
    }

    if (this.type === "string") {
      this.text += value;
      return this;
    }

    const node = new ParseNode(this);
    node.setType("string");
    return node.concat(value);
  }

  getText() {
    let result = "";

    if (this.type === "synonyms") {
      if (this.subNodes.length === 0) {
        return "";
      }

      if (this.usedIndexes.length === 0) {
        this.usedIndexes = this.subNodes.map((_, index) => index);
      }

      const randomPosition = getRandomInt(0, this.usedIndexes.length - 1);
      const selectedNodeIndex = this.usedIndexes.splice(randomPosition, 1)[0];
      result = this.subNodes[selectedNodeIndex].getText();
    } else if (this.type === "mixing") {
      const nodes = this.subNodes.slice();
      shuffleInPlace(nodes);
      for (let i = 0; i < nodes.length; i += 1) {
        if (result) {
          result += this.separator;
        }
        result += nodes[i].getText();
      }
    } else if (this.type === "series") {
      for (let i = 0; i < this.subNodes.length; i += 1) {
        result += this.subNodes[i].getText();
      }
    } else {
      result = this.text;
    }

    result = result.replace(/ +/g, " ");
    result = result.replace(/%rand%/g, () => String(getRandomInt(0, 9)));

    return result;
  }

  getVariantCount() {
    if (this.type === "synonyms") {
      return this.subNodes.reduce((total, child) => total + child.getVariantCount(), 0n);
    }

    if (this.type === "mixing") {
      let total = 1n;
      for (let i = 2n; i <= BigInt(this.subNodes.length); i += 1n) {
        total *= i;
      }
      for (let i = 0; i < this.subNodes.length; i += 1) {
        total *= this.subNodes[i].getVariantCount();
      }
      return total;
    }

    if (this.type === "series") {
      return this.subNodes.reduce((total, child) => total * child.getVariantCount(), 1n);
    }

    if (this.type === "string") {
      return getRandMultiplier(this.text);
    }

    return 1n;
  }
}

function getRandMultiplier(text) {
  const value = String(text || "");
  let count = 0;
  let from = 0;

  while (true) {
    const index = value.indexOf(RAND_TOKEN, from);
    if (index === -1) {
      break;
    }
    count += 1;
    from = index + RAND_TOKEN.length;
  }

  return count > 0 ? 10n ** BigInt(count) : 1n;
}

function shuffleInPlace(list) {
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = getRandomInt(0, i);
    const temp = list[i];
    list[i] = list[j];
    list[j] = temp;
  }
}

function getRandomInt(min, max) {
  const lo = Math.ceil(min);
  const hi = Math.floor(max);

  if (window.crypto && typeof window.crypto.getRandomValues === "function") {
    const range = hi - lo + 1;
    if (range <= 0) {
      return lo;
    }

    const maxUint = 0x100000000;
    const limit = Math.floor(maxUint / range) * range;
    const buf = new Uint32Array(1);

    while (true) {
      window.crypto.getRandomValues(buf);
      if (buf[0] < limit) {
        return lo + (buf[0] % range);
      }
    }
  }

  return lo + Math.floor(Math.random() * (hi - lo + 1));
}

function nextToken(text, fromIndex) {
  const current = text[fromIndex];

  if (!current) {
    return null;
  }

  if (current === "\\") {
    const next = text[fromIndex + 1];
    if (next && "\\+{}[]|".includes(next)) {
      return {
        token: `\\${next}`,
        index: fromIndex + 2,
      };
    }

    return {
      token: "\\",
      index: fromIndex + 1,
    };
  }

  if (current === "[" && text[fromIndex + 1] === "+") {
    return {
      token: "[+",
      index: fromIndex + 2,
    };
  }

  if ("+{}[]|".includes(current)) {
    return {
      token: current,
      index: fromIndex + 1,
    };
  }

  let i = fromIndex;
  while (i < text.length && !"\\+{}[]|".includes(text[i])) {
    i += 1;
  }

  return {
    token: text.slice(fromIndex, i),
    index: i,
  };
}

function compileTemplate(input) {
  const text = String(input || "");
  const tree = new ParseNode();

  let currentNode = new ParseNode(tree);
  currentNode.setType("series");
  currentNode = currentNode.concat("");

  let index = 0;
  while (index < text.length) {
    const piece = nextToken(text, index);
    if (!piece) {
      break;
    }

    const token = piece.token;
    index = piece.index;

    if (token === "\\\\" || token === "\\") {
      currentNode = currentNode.concat("\\");
      continue;
    }

    if (token === "\\+") {
      currentNode = currentNode.concat("+");
      continue;
    }

    if (token === "\\{") {
      currentNode = currentNode.concat("{");
      continue;
    }

    if (token === "\\}") {
      currentNode = currentNode.concat("}");
      continue;
    }

    if (token === "\\[") {
      currentNode = currentNode.concat("[");
      continue;
    }

    if (token === "\\]") {
      currentNode = currentNode.concat("]");
      continue;
    }

    if (token === "\\|") {
      currentNode = currentNode.concat("|");
      continue;
    }

    if (token === "[+") {
      if (currentNode.type === "string") {
        currentNode = new ParseNode(currentNode.parent);
      } else {
        currentNode = new ParseNode(currentNode);
      }
      currentNode.isSeparator = true;
      continue;
    }

    if (token === "+") {
      if (currentNode.isSeparator) {
        currentNode.isSeparator = false;
        currentNode = new ParseNode(currentNode);
        currentNode.setType("series");
        currentNode = currentNode.concat("");
      } else {
        currentNode = currentNode.concat("+");
      }
      continue;
    }

    if (token === "{") {
      if (currentNode.type === "string") {
        currentNode = new ParseNode(currentNode.parent);
      } else {
        currentNode = new ParseNode(currentNode);
      }

      currentNode.setType("synonyms");
      currentNode = new ParseNode(currentNode);
      currentNode.setType("series");
      currentNode = currentNode.concat("");
      continue;
    }

    if (token === "}") {
      const candidate = currentNode.parent && currentNode.parent.parent;
      if (candidate && candidate.type === "synonyms") {
        currentNode = candidate.parent;
        currentNode = currentNode.concat("");
      } else {
        currentNode = currentNode.concat("}");
      }
      continue;
    }

    if (token === "[") {
      if (currentNode.type === "string") {
        currentNode = new ParseNode(currentNode.parent);
      } else {
        currentNode = new ParseNode(currentNode);
      }

      currentNode = new ParseNode(currentNode);
      currentNode.setType("series");
      currentNode = currentNode.concat("");
      continue;
    }

    if (token === "]") {
      const candidate = currentNode.parent && currentNode.parent.parent;
      if (candidate && candidate.type === "mixing" && candidate.parent) {
        currentNode = candidate.parent;
        currentNode = currentNode.concat("");
      } else {
        currentNode = currentNode.concat("]");
      }
      continue;
    }

    if (token === "|") {
      const seriesNode = currentNode.parent;
      if (seriesNode && seriesNode.type === "series") {
        currentNode = seriesNode.parent;
        currentNode = new ParseNode(currentNode);
        currentNode.setType("series");
        currentNode = currentNode.concat("");
      } else {
        currentNode = currentNode.concat("|");
      }
      continue;
    }

    currentNode = currentNode.concat(token);
  }

  return tree;
}

function setStatus(target, message) {
  const existing = state.messageTimers.get(target);
  if (existing) {
    clearTimeout(existing);
  }

  target.textContent = message;

  if (!message) {
    return;
  }

  const timer = setTimeout(() => {
    target.textContent = "";
  }, 2400);

  state.messageTimers.set(target, timer);
}

function copyText(text, statusNode, label) {
  if (!text) {
    return;
  }

  const message = label ? `${label} copied.` : "Copied to clipboard.";

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard
      .writeText(text)
      .then(() => setStatus(statusNode, message))
      .catch(() => setStatus(statusNode, "Copy failed."));
    return;
  }

  const fallback = document.createElement("textarea");
  fallback.value = text;
  fallback.setAttribute("readonly", "");
  fallback.style.position = "absolute";
  fallback.style.left = "-9999px";
  document.body.appendChild(fallback);
  fallback.select();

  try {
    document.execCommand("copy");
    setStatus(statusNode, message);
  } catch (error) {
    setStatus(statusNode, "Copy failed.");
  }

  document.body.removeChild(fallback);
}

function parseNumber(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function clampNumber(value, min, max) {
  if (Number.isNaN(value)) {
    return min;
  }
  return Math.min(Math.max(value, min), max);
}

function normalizeTheme(theme) {
  return THEMES.has(theme) ? theme : DEFAULTS.theme;
}

function normalizeOutputFormat(format) {
  return OUTPUT_FORMATS.has(format) ? format : DEFAULTS.outputFormat;
}

function normalizeSettings(raw) {
  const safe = raw && typeof raw === "object" ? raw : {};

  return {
    count: clampNumber(
      parseNumber(safe.count, DEFAULTS.count),
      RANDOM_LIMITS.countMin,
      RANDOM_LIMITS.countMax
    ),
    template: typeof safe.template === "string" ? safe.template : DEFAULTS.template,
    theme: normalizeTheme(String(safe.theme || DEFAULTS.theme)),
    outputFormat: normalizeOutputFormat(String(safe.outputFormat || DEFAULTS.outputFormat)),
  };
}

function getStoredSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    return normalizeSettings(JSON.parse(raw));
  } catch (error) {
    return null;
  }
}

function setStoredSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    // Ignore storage errors (private mode, etc.)
  }
}

function getCurrentSettings() {
  return {
    count: clampNumber(
      parseNumber(ui.count.value, DEFAULTS.count),
      RANDOM_LIMITS.countMin,
      RANDOM_LIMITS.countMax
    ),
    template: ui.template.value,
    theme: state.theme,
    outputFormat: state.outputFormat,
  };
}

function storeSettings() {
  setStoredSettings(getCurrentSettings());
}

function setCount(value) {
  const parsed = parseNumber(value, DEFAULTS.count);
  const count = clampNumber(parsed, RANDOM_LIMITS.countMin, RANDOM_LIMITS.countMax);
  ui.count.value = `${count}`;
  return count;
}

function setTheme(theme) {
  const nextTheme = normalizeTheme(theme);
  state.theme = nextTheme;

  ui.themeButtons.forEach((button) => {
    const isActive = button.dataset.theme === nextTheme;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
  });

  if (nextTheme === "auto") {
    document.documentElement.removeAttribute("data-theme");
  } else {
    document.documentElement.setAttribute("data-theme", nextTheme);
  }
}

function updateDownloadButtonLabel() {
  if (!ui.downloadLabel) {
    return;
  }
  ui.downloadLabel.textContent = state.outputFormat === "json" ? "Download .json" : "Download .txt";
}

function setOutputFormat(format) {
  const nextFormat = normalizeOutputFormat(format);
  state.outputFormat = nextFormat;

  ui.outputFormatButtons.forEach((button) => {
    const isActive = button.dataset.outputFormat === nextFormat;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
  });

  updateDownloadButtonLabel();
}

function formatBigInt(value) {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function formatVariantCount(value) {
  const MAX_LEN = 18;
  const text = value.toString();
  if (text.length <= MAX_LEN) {
    return formatBigInt(value);
  }
  return `>${text.slice(0, MAX_LEN)}...`;
}

function getTimestampForFilename() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  return `${yyyy}${mm}${dd}-${hh}${min}${ss}`;
}

function downloadFile(content, filename, mimeType) {
  if (!content) {
    return;
  }

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function getTextOutput() {
  return state.outputList.join(OUTPUT_SEPARATOR);
}

function getJsonOutput() {
  return JSON.stringify(state.outputList, null, 2);
}

function getOutputText() {
  if (state.outputFormat === "json") {
    return getJsonOutput();
  }
  return getTextOutput();
}

function toSafeCountFromBigInt(value, fallbackCount) {
  return value >= BigInt(fallbackCount) ? fallbackCount : Number(value);
}

function buildUniqueOutputList(root, targetCount) {
  const result = [];
  const seen = new Set();
  const maxAttempts = Math.max(200, targetCount * 120);
  let attempts = 0;

  while (result.length < targetCount && attempts < maxAttempts) {
    const next = root.getText();
    if (!seen.has(next)) {
      seen.add(next);
      result.push(next);
    }
    attempts += 1;
  }

  return result;
}

function refreshOutput() {
  const requestedCount = setCount(ui.count.value);
  const template = ui.template.value || "";
  const root = compileTemplate(template);
  const variants = root.getVariantCount();
  const targetCount = toSafeCountFromBigInt(variants, requestedCount);

  const nextList = buildUniqueOutputList(root, targetCount);

  state.outputList = nextList;

  ui.output.textContent = getOutputText();
  ui.output.classList.toggle("is-single", nextList.length === 1);
  ui.generatedCount.textContent = String(nextList.length);

  ui.variantCount.textContent = formatVariantCount(variants);

  if (nextList.length < requestedCount) {
    setStatus(
      ui.status,
      `Requested ${requestedCount}, generated ${nextList.length} unique variant${
        nextList.length === 1 ? "" : "s"
      }.`
    );
  }
}

function downloadOutput() {
  const output = getOutputText();
  if (!output) {
    setStatus(ui.status, "Nothing to download.");
    return;
  }

  const count = state.outputList.length;
  const timestamp = getTimestampForFilename();
  const suffix = count > 1 ? `-${count}` : "";

  if (state.outputFormat === "json") {
    const filename = `randomized${suffix}-${timestamp}.json`;
    downloadFile(`${output}\n`, filename, "application/json;charset=utf-8");
    setStatus(ui.status, "JSON downloaded.");
    return;
  }

  const filename = `randomized${suffix}-${timestamp}.txt`;
  downloadFile(`${output}\n`, filename, "text/plain;charset=utf-8");
  setStatus(ui.status, "TXT downloaded.");
}

function scheduleTemplateRefresh() {
  if (state.inputTimer) {
    clearTimeout(state.inputTimer);
  }

  state.inputTimer = setTimeout(() => {
    refreshOutput();
    storeSettings();
  }, 160);
}

function applySettings(settings) {
  const normalized = normalizeSettings(settings || DEFAULTS);
  setCount(normalized.count);
  ui.template.value = normalized.template;
  setOutputFormat(normalized.outputFormat);
  setTheme(normalized.theme);
}

function resetDefaults() {
  applySettings(DEFAULTS);
  refreshOutput();
  storeSettings();
}

function bindEvents() {
  if (ui.reset) {
    ui.reset.addEventListener("click", resetDefaults);
  }

  ui.refresh.addEventListener("click", () => {
    refreshOutput();
    storeSettings();
  });

  ui.copy.addEventListener("click", () => {
    const label = state.outputFormat === "json" ? "JSON output" : "Output";
    copyText(getOutputText(), ui.status, label);
  });

  ui.download.addEventListener("click", downloadOutput);

  ui.outputWrap.addEventListener("click", (event) => {
    if (event.target.closest("button")) {
      return;
    }
    const label = state.outputFormat === "json" ? "JSON output" : "Output";
    copyText(getOutputText(), ui.status, label);
  });

  ui.count.addEventListener("input", () => {
    refreshOutput();
    storeSettings();
  });

  ui.template.addEventListener("input", scheduleTemplateRefresh);

  ui.outputFormatButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setOutputFormat(button.dataset.outputFormat || DEFAULTS.outputFormat);
      refreshOutput();
      storeSettings();
    });
  });

  ui.themeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setTheme(button.dataset.theme || "auto");
      storeSettings();
    });
  });
}

const storedSettings = getStoredSettings();
applySettings(storedSettings || DEFAULTS);
bindEvents();
refreshOutput();
