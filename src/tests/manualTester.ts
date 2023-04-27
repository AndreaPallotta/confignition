import confignition from '../index';

confignition.parse('src/tests/configs/config.toml');

let config = confignition.getConfig();

console.log(config);
