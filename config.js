const getEnv = () => process.env.NODE_ENV || "local" 

const config = {}

const getConfig = (type) => {
  if (!config[type]) {
    config[type] = require(`./${type}-config-${env}`)
  }
  
  return config[type]
}
