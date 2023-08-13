import { Injectable } from '@nestjs/common'
import * as os from 'os'

const cluster = require('cluster')
const numCPUs = os.cpus().length

@Injectable()
export class Cluster {
  static clusterize(callback): void {
    if (cluster.isMaster) {
      for (let i = 0; i < numCPUs; i++) {
        cluster.fork()
      }
      cluster.on('exit', (worker, code, signal) => {
        console.log(`Worker : ${worker}`)
        console.log(`Code : ${code}`)
        console.log(`Signal : ${signal}`)
        cluster.fork()
      })
    } else {
      if (callback) callback()
    }
  }
}
