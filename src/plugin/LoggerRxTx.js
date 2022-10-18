/**
 * @module pn532.js/plugin/LoggerRxTx
 * @example
 * import Pn532LoggerRxTx from 'pn532.js/plugin/LoggerRxTx'
 */

/**
 * This plugin is used to debug adapter commucation.
 * @example
 * const pn532 = new Pn532()
 * pn532.use(new Pn532LoggerRxTx())
 */
export default class Pn532LoggerRxTx {
  name = 'loggerRxTx'

  install (context, pluginOption) {
    const { Packet, pn532, utils } = context
    const { short = true } = pluginOption

    const preamble = Packet.fromHex('0000FF')
    const postamble = Packet.fromHex('00')
    const frameAck = Packet.fromHex('0000FF00FF00')

    const inspectPn532Frame = pack => {
      if (!short) return pack.inspect
      if (pack.length < 8) return pack.inspect
      if (!(pack.subarray(0, 3).isEqual(preamble) && pack.subarray(-1).isEqual(postamble))) return pack.inspect
      return pack.getUint16(3) === 0xFFFF ? pack.subarray(9, -2).inspect : pack.subarray(6, -2).inspect
    }

    pn532.addMiddleware('writePacket', async (ctx, next) => {
      utils.logTime(`tx = ${inspectPn532Frame(ctx.pack)}`)
      return await next()
    })

    pn532.addMiddleware('skipRespLogger', async (ctx, next) => {
      const { message, resp } = ctx
      utils.logTime(`rx skipped, message = ${message}, resp = ${resp.pack.inspect}`)
      return await next()
    })

    pn532.addMiddleware('readRespTimeout', async (ctx, next) => {
      const resp = await next()
      if (!resp.pack.isEqual(frameAck)) utils.logTime(`rx = ${inspectPn532Frame(resp.pack)}`)
      return resp
    })
  }
}
