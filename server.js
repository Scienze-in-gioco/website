const express = require("express")
const app = new express()
const { 
  p,
  port = p || 8080,
  env = process.env.NODE_ENV || "local" 
} = require("simple-argv")

const TABLES = ["contents", "tags", "attachments", "categories"]
const mysql = require("mysql")
const bodyparser = require("body-parser")
const { readFileSync } = require("fs")
const Treeize = require("treeize")

app.use(bodyparser.json())

const dbConfig = require(`./db-config-${env}`)
const pool = mysql.createPool({
  connectionLimit : 10,
  ...dbConfig
})
const jwt = require("jsonwebtoken")
const secret = readFileSync("./rsa/id_rsa", "utf8")

app.use((req, res, next) => {
  res.error = (err, status = 500) => {
    res.status(status).json({
      error: env === "production" ? err.message : err.stack
    })
  }

  next()
})

app.use((req, res, next) => {
  const { query: { filter } } = req

  if (typeof filter !== "undefined") {
    try {
      req.filter = JSON.parse(filter)
    } catch(_) {
      return res.error(new Error("filter must be a valid json"), 400)
    }

    if (typeof req.filter !== "object") {
      return res.error(new Error("filter must be an object"), 400)
    }
  } else {
    req.filter = {}
  }

  next()
})

app.get("/", (req, res) => {
  res.send("questa sarà la nostra home page")
})

app.post("/login", ({ body }, res) => {
  const { email, password } = body

  if (email === "admin@gmail.com" && password === "admin") {
    const token = jwt.sign({ 
      email
    }, 
    secret, {
      expiresIn: "1h" 
    }
    )

    res.json({
      token
    })
  } else {
    res.status(401).json({
      message: "wrong email or password"
    })
  }
})

const auth = (req, res, next) => {
  const token = req.get("authorization")
  jwt.verify(token, secret, (err, decoded) => {
    if (err) {
      res.status(403).json({ message: err.message })
    } else {
      req.token = decoded
      next()
    }
  })
}

app.get("/admin", auth, ({ token: { email } }, res) => {
  res.send(`<h1>benvenuto ${email}</h1>`)
})

TABLES.forEach(table => {
  app.delete(`/api/${table}/:id`, ({ params: { id } }, res) => {
    pool.query(`DELETE FROM ${table} WHERE id=${pool.escape(id)}`, (err, results) => {
      if (err) {
        res.error(err)
      } else {
        res.json({
          results
        })
      }
    })
  })

  app.get(`/api/${table}`, (req, res) => {
    pool.query(`SELECT * FROM ${table}`, (err, results) => {
      if (err) {
        res.error(err)
      } else {
        res.json({
          results
        })
      }
    })
  })

})

app.get("/api/c", ({ filter: { limit = 10 } }, res) => {
  const treeize = new Treeize()
  pool.query(`
SELECT
co.id,
co.permalink,
co.title,
co.body,
co.author,
co.draft,
co.featured,
co.pubblicationDate,

ca.name AS "categories:name",
ca.permalink AS "categories:permalink",

t.name AS "tags:name",
t.permalink AS "tags:permalink",

a.href AS "attachments:href",
a.contentType AS "attachments:type",
a.description AS "attachments:description"

FROM (SELECT * FROM Contents LIMIT ${limit} OFFSET 0) AS co
LEFT JOIN ContentsCategoriesTh AS cct ON cct.contentId = co.id
LEFT JOIN Categories AS ca ON cct.categoryId = ca.id
LEFT JOIN ContentsTagsTh AS ctt ON ctt.contentId = co.id
LEFT JOIN Tags AS t ON ctt.tagId = t.id
LEFT JOIN ContentsAttachmentsTh AS cat ON cat.contentId = co.id
LEFT JOIN Attachments AS a ON cat.attachmentId = ca.id
    `, (err, results) => {
    if (err) {
      res.error(err)
    } else {
      res.json({
        results: treeize.grow(results).getData()
      })
    }
  })
})

app.all("*", (req, res) => {
  res.status(404).send("Pagina non trovata")
})

app.listen(port, () => console.log(`app is listening on port ${port} on env ${env}`))
