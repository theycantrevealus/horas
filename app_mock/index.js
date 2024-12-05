const jsonServer = require('json-server')
const path = require('path')
const server = jsonServer.create()
const router = jsonServer.router(path.join(__dirname, 'db.json'))
const middlewares = jsonServer.defaults()

server.use(middlewares)

server.post('/v1/account/signin', (req, res) => {
  res.jsonp({
    statusCode: {
      defaultCode: 200,
      customCode: 'S0000',
      classCode: 'XXX'
    },
    message: 'Sign in success',
    payload: require('./signin.json'),
    transaction_classify: '',
    transaction_id: null
  })
})

server.use((req, res, next) => {
  const method = req.method
  const url = req.url

  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers', '*')

  next()
})

server.use(router)

router.render = (req, res) => {
  const method = req.method
  const url = req.url
  
  if(method === 'GET') {
    res.jsonp({
      statusCode: {
        defaultCode: 200,
        customCode: 'S0000',
        classCode: 'XXX'
      },
      message: 'Data fetched',
      payload: {
        totalRecords: 2,
        data: res.locals.data
      },
      transaction_classify: '',
      transaction_id: null
    })
  } else {
    res.jsonp({
      statusCode: {
        defaultCode: 200,
        customCode: 'S0000',
        classCode: 'XXX'
      },
      payload: {},
      transaction_classify: '',
      transaction_id: null
    })
  }
}
server.listen(10200, () => {
  console.log('JSON Server is running')
})