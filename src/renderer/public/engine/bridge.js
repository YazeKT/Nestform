// Named bridge only: this sandbox has no Node integration or filesystem access.
(function(){
  var listeners={};
  window.require=function(name){
    if(name==='electron')return {ipcRenderer:{on:function(channel,callback){listeners[channel]=callback;},send:function(channel,payload){if(channel!=='background-start')throw Error('Invalid engine channel');window.engineBridge.start(payload);}}};
    if(name==='path'||name==='url')return {};
    throw Error('Unavailable engine dependency');
  };
  window.engineBridge.onBackground(function(kind,payload){if(listeners[kind])listeners[kind]({},payload);if(window.onEngineBackground)window.onEngineBackground(kind,payload);});
})();
