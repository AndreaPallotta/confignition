import confignition from '../index';

confignition.parse('src/tests/configs/config.yaml', 'dotenv');

let config = confignition.getConfig();

console.log(config);
