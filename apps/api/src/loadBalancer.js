const { loadBalancerInstances } = require('./config');

// Balanceador de cargas simple por ronda (round-robin) con conteo de
// peticiones en curso por instancia logica. En Vercel el balanceo real lo
// hace la plataforma; este middleware mantiene la logica centralizada y
// expone la instancia asignada en la cabecera X-Instance-Id.
const instances = Array.from({ length: loadBalancerInstances }, (_, i) => ({
  id: `api-${i + 1}`,
  inFlight: 0,
  total: 0
}));
let cursor = 0;

function pickInstance() {
  // Elige la instancia con menos peticiones totales; en empate, round-robin
  // favoreciendo la de menor carga en curso.
  let best = null;
  for (const inst of instances) {
    if (!best || inst.total < best.total ||
        (inst.total === best.total && inst.inFlight < best.inFlight)) {
      best = inst;
    }
  }
  cursor = (instances.indexOf(best) + 1) % instances.length;
  return best;
}

function loadBalancer(req, res, next) {
  const inst = pickInstance();
  inst.inFlight += 1;
  inst.total += 1;
  req.instance = inst;
  res.setHeader('X-Instance-Id', inst.id);

  const release = () => { inst.inFlight = Math.max(0, inst.inFlight - 1); };
  res.on('finish', release);
  res.on('close', release);
  next();
}

function stats() {
  return instances.map(i => ({ id: i.id, inFlight: i.inFlight, total: i.total }));
}

module.exports = { loadBalancer, stats };
