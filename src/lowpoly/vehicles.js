import { Vector3 } from '../../vendor/three.module.js';
import { createFlight } from './flight.js';
import { shipFrameRadius } from './spatial.js';

export const BIKE_PROFILE = Object.freeze({ speed: 14, boost: 25, acceleration: 9, brake: 13, coast: .12 });
const BIKE_ANCHORS = { dock: new Vector3(1.45, 0, .25), eva: new Vector3(1.8, 0, .25), tether: new Vector3(0, .96, .43) };
const BIKE_HULL = [{ center: { x:0, y:.52, z:0 }, radius:.68 }];
const idle = new Vector3();

/** Two physical bases share the proven EVA flight rules. Switching bases never
 * stretches a tether across the map, and gem return pilots the bike back first. */
export function createVehicles() {
  const ship = createFlight(), bike = createFlight({ vehicleProfile: BIKE_PROFILE, anchors: BIKE_ANCHORS,
    collisionSpheres: () => BIKE_HULL, frameRadius: () => 1.6, turnRate: 105 });
  let active = bike, stage = 1, discovered = false, transfer = false;
  const health = { astronaut:100, bike:100, ship:100 };
  const rendezvous = new Vector3(), offset = new Vector3();
  function parkBike() {
    bike.reset({aboard:true});
    bike.shipPosition.copy(ship.shipPosition).add(offset.set(shipFrameRadius(stage)+3, 0, 2).applyQuaternion(ship.shipQuaternion));
    bike.update(1/120, idle, false, {hold:true});
  }
  function switchToShip() {
    const position = active.actor === 'astronaut' ? active.astronautPosition : null;
    if (!position || !ship.adoptEVA(position)) return false;
    active = ship;
    return ship.returnToShip();
  }
  const vehicles = {
    shipPosition:ship.shipPosition, shipQuaternion:ship.shipQuaternion,
    bikePosition:bike.shipPosition, bikeQuaternion:bike.shipQuaternion,
    health,
    get actor(){return active.actor==='astronaut'?'astronaut':active===bike?'bike':'ship';},
    get base(){return active===bike?'bike':'ship';},
    get position(){return active.position;},
    get astronautPosition(){return active.astronautPosition;},
    get velocity(){return active.velocity;}, get thrust(){return active.thrust;},
    get vehicleQuaternion(){return active.shipQuaternion;},
    get returning(){return transfer||active.returning;},
    get braking(){return active.braking;}, get arrived(){return active.arrived;},
    get shipYaw(){return active.shipYaw;}, get shipPitch(){return active.shipPitch;},
    get angularSpeed(){return active.angularSpeed;},
    get dockPosition(){return active.dockPosition;}, get tetherPosition(){return active.tetherPosition;},
    get tetherLength(){return active.tetherLength;}, get tension(){return active.tension;},
    get shipDiscovered(){return discovered;},
    get integrity(){return health[vehicles.actor];},
    get canBoardShip(){return discovered && vehicles.actor!=='ship' && vehicles.position.distanceTo(ship.shipPosition)<shipFrameRadius(stage)+8;},
    get canMountBike(){return vehicles.actor==='ship'||vehicles.actor==='astronaut'&&vehicles.position.distanceTo(bike.shipPosition)<4;},
    setStage(value){stage=value;ship.setStage(value);},
    reset({aboard=false,shipDiscovered=aboard}={}){
      transfer=false;discovered=shipDiscovered;stage=1;
      ship.reset({aboard:true});parkBike();
      if(aboard)active=ship;
      else{active=bike;bike.shipPosition.set(24,8,44);bike.update(1/120,idle,false,{hold:true});}
      for(const key of Object.keys(health))health[key]=100;
    },
    deploy(){if(transfer)return false;return active.deploy();},
    mountBike(){
      if(transfer||active.returning||!vehicles.canMountBike)return false;
      if(vehicles.actor==='ship'){parkBike();active=bike;return true;}
      if(active!==bike){if(!bike.adoptEVA(active.astronautPosition))return false;active=bike;}
      return bike.returnToShip();
    },
    /** Manual return prefers the nearby ship, otherwise the current EVA base. */
    returnToShip({automatic=false}={}){
      if(vehicles.actor==='ship'||transfer||active.returning)return false;
      if(automatic&&active===bike){transfer=true;if(bike.actor==='astronaut')bike.returnToShip();return true;}
      if(vehicles.canBoardShip){
        if(active===bike&&bike.actor==='ship')bike.deploy();
        if(active===ship)return ship.returnToShip();
        return switchToShip();
      }
      return active.actor==='astronaut'?active.returnToShip():false;
    },
    updateHeading(dt, options){active.updateHeading(dt,options);},
    applyImpact(normal,depth,velocity){return active.applyImpact(normal,depth,velocity);},
    update(dt,direction,boost,options={}){
      if(transfer&&active===bike){
        if(bike.actor==='astronaut')bike.update(dt,idle,false,{});
        else{
          rendezvous.copy(ship.shipPosition).add(offset.set(shipFrameRadius(stage)+5,0,-2.5).applyQuaternion(ship.shipQuaternion));
          bike.update(dt,idle,false,{navigationTarget:rendezvous,arrivalRadius:.3});
          if(bike.arrived){bike.deploy();if(switchToShip())transfer=false;}
        }
      }else active.update(dt,direction,boost,options);
      if(!discovered&&vehicles.position.distanceTo(ship.shipPosition)<24)discovered=true;
    },
    damage(amount){
      if(!Number.isFinite(amount)||amount<=0)return false;
      const kind=vehicles.actor;health[kind]=Math.max(0,health[kind]-amount);return health[kind]===0;
    },
    parkBike,
  };
  // A recovery changes transport state only; mission/save ownership stays above it.
  vehicles.recover=()=>{const kind=vehicles.actor,priorStage=stage,found=discovered,priorBase=vehicles.base,priorHealth={...health};
    vehicles.reset({aboard:priorBase==='ship',shipDiscovered:found});vehicles.setStage(priorStage);
    Object.assign(health,priorHealth,{[kind]:100});
    if(kind==='astronaut')active.deploy();return kind;
  };
  vehicles.reset();return vehicles;
}
