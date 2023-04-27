interface Config {
    [key: string]: unknown;
}

const _parseDotenv = (content: string) => {
    const lines = content.split('\n');

    let config: Config = {};

    for (const line of lines) {
        const trimmedLine = line.trim();

        if (!trimmedLine || trimmedLine.startsWith('#')) {
            continue;
        }

        const [record] = trimmedLine.split('#');
        const [key, value] = record.trim().split('=');

        config[key] = _parseValue(value);
    }

    return config;
};

const _parseToml = (content: string) => { };
const _parseYaml = (content: string) => { };
const _parseJson = (content: string) => { };
const _parseIni = (content: string) => { };

const _parseValue = (value: string): any => {
    if (value === 'null') return null;
    if (value === 'true') return true;
    if (value === 'false') return false;

    const parsedNumber = parseFloat(value);
    if (!isNaN(parsedNumber)) return parsedNumber;

    const parsedDate = new Date(value);
    if (!isNaN(parsedDate.getTime())) {
        return parsedDate;
    }

    try {
        const parsedObject = JSON.parse(value);
        if (typeof parsedObject === 'object' && parsedObject !== null) {
            return parsedObject;
        }
    } catch (e) { };
    return value;
};

const parser = {
    parseDotenv: _parseDotenv,
    parseToml: _parseToml,
    parseYaml: _parseYaml,
    parseJson: _parseJson,
    parseIni: _parseIni,
}

export default parser;
