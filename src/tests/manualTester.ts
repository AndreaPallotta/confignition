import confignition from '../index';

confignition.parse('src/tests/configs/config.toml', 'toml');

let config = confignition.getConfig();

console.log(config);
