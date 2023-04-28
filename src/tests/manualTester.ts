import confignition from '../index';

confignition.parse('src/tests/configs/config.ini');

const config = confignition.getConfig();

console.log(config);
