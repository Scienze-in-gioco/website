const express = require("express")
const app = new express()
const { p, port = p || 8080, env = process.env.NODE_ENV || "local" } = require("simple-argv")
const mysql = require("mysql")

const config = require(`./db-config-${env}`)
const pool = mysql.createPool({
  connectionLimit : 10,
  multipleStatements: true,
  ...config
})

app.get("/", (req, res) => {
  res.send("questa sarà la nostra home page")
})

app.get("/api/contents", (req, res) => {
  pool.query("SELECT * FROM contents", (err, results) => {
    if (err) {
      res.status(500).json({
        error: env == "production" ? err.message : err.stack
      })
    } else {
      res.json({
        results
      })
    }
  })
})

app.all("*", (req, res) => {
  res.status(404).send("Pagina non trovata")
})

app.listen(port, () => console.log(`app is listening on port ${port} on env ${env}`))