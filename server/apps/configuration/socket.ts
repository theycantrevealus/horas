export const SocketConfig = () => ({
  socket_io: {
    host: process.env.SOCKET_IO_HOST,
    port: parseInt(process.env.SOCKET_IO_PORT),
  },
  neural: {
    event: {
      proceed: 'proceed',
    },
  },
})
