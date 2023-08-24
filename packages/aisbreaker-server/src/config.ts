import { utils } from 'aisbreaker-api-js'


const config = {
    //
    // basic config
    //
    loggerLevel: 'debug'
};
  
export default config
  
// final logging
utils.logger.info("aisbreaker-server: config.loggerLevel="+config.loggerLevel);
