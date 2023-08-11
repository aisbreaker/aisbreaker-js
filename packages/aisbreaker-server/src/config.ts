const config = {
    //
    // basic config
    //
    loggerLevel: 'debug'
};
  
export default config
  
// final logging
log("config.loggerLevel="+config.loggerLevel);
  
  
//
// internal helpers (general)
//
function log(s: string) {
    console.log("***** CONFIG: "+s)
}
