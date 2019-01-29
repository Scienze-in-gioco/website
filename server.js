const express = require("express")
const app = new express()
const { 
  p,
  port = p || 8080,
  env = process.env.NODE_ENV || "local" 
} = require("simple-argv")

const config = require("./config")

const TABLES = ["contents", "tags", "attachments", "categories"]
const mysql = require("mysql")
const bodyparser = require("body-parser")
const { readFileSync } = require("fs")

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
      error: env == "production" ? err.message : err.stack
    })
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
      secret,
      {
        expiresIn: '1h' 
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

app.get("/api/c", (req, res) => {
  pool.query(`
SELECT 
  c.permalink, 
  c.title,
  c.body,
  c.author,
  c.draft,
  c.featured,
  c.pubblicationDate,
  t.name AS tags:tagName,
  cat.name AS categoryName

FROM Contents AS c

INNER JOIN ContentsAttachmentsTh ON Contents.id = ContentsAttachmentsTh.contentId
INNER JOIN Attachments AS a ON ContentsAttachmentsTh.attachmentId = Attachments.id

INNER JOIN ContentsCategoriesTh ON Contents.id = ContentsCategoriesTh.contentId
INNER JOIN Categories AS cat ON ContentsCategoriesTh.categoryId = Categories.id

INNER JOIN ContentsTagsTh ON Contents.id = ContentsTagsTh.contentId
INNER JOIN Tags AS t ON ContentsTagsTh.tagId = Tags.id
    `, (err, results) => {
    if (err) {
        res.error(err)
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