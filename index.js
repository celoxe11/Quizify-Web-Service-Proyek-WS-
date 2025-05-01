const express = require('express')
const app = express()

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => res.send('Hello World!'))

const port = 3000
app.listen(port, () => console.log(`Example app listening on port ${port}!`))