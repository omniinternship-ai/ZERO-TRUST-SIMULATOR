(() => {
'use strict';
const defaults={skin:'#f5c996',hair:'#513f37',hairStyle:'short',shirt:'#f5f4de',pants:'#3c8e91',accessory:'none'};
const options={skin:[['#f5c996','ผิวน้ำผึ้ง'],['#ffe0c4','ผิวอ่อน'],['#be875d','ผิวแทน'],['#78503c','ผิวเข้ม']],hair:[['#513f37','น้ำตาลเข้ม'],['#191e29','ดำ'],['#d2a557','ทอง'],['#8055ad','ม่วง']],hairStyle:[['short','ผมสั้น'],['swept','ปัดข้าง'],['bob','บ๊อบ']],shirt:[['#f5f4de','ครีม'],['#4d9f91','เขียวมินต์'],['#9372c8','ม่วง'],['#e99962','ส้ม'],['#527fb6','น้ำเงิน']],pants:[['#3c8e91','เขียวทะเล'],['#444e76','กรมท่า'],['#785f50','น้ำตาล'],['#343a40','ดำ']],accessory:[['none','ไม่ใส่'],['cap','หมวกแก๊ป'],['backpack','กระเป๋า']]};
const KEY='zerotrust_avatar_v1';
function sanitize(value){const result={...defaults};for(const k of Object.keys(defaults)){if(options[k].some(([v])=>v===value?.[k]))result[k]=value[k];}return result;}
function load(){try{return sanitize(JSON.parse(localStorage.getItem(KEY)));}catch(_){return {...defaults};}}
function save(value){const config=sanitize(value);try{localStorage.setItem(KEY,JSON.stringify(config));return true;}catch(_){return false;}}
function create(value){const c=sanitize(value),T=window.THREE,g=new T.Group(),materials=new Map();
function box(w,h,d,color,x,y,z,parent=g){if(!materials.has(color))materials.set(color,new T.MeshStandardMaterial({color,roughness:.85}));const m=new T.Mesh(new T.BoxGeometry(w,h,d),materials.get(color));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
box(.85,.95,.48,c.shirt,0,1.62,0);box(.66,.65,.62,c.skin,0,2.47,0);
box(.72,.18,.68,c.hair,0,2.86,0);box(.18,.4,.65,c.hair,-.29,2.65,-.02);
if(c.hairStyle==='swept'){const fringe=box(.65,.2,.2,c.hair,.09,2.79,.32);fringe.rotation.z=-.18;}
if(c.hairStyle==='bob'){box(.15,.65,.65,c.hair,.3,2.53,-.04);box(.72,.65,.18,c.hair,0,2.53,-.3);}
const limbs=[];for(const side of [-1,1]){const arm=new T.Group();arm.position.set(side*.62,2.03,0);box(.32,.58,.4,c.shirt,0,-.28,0,arm);box(.31,.35,.39,c.skin,0,-.74,0,arm);g.add(arm);const leg=new T.Group();leg.position.set(side*.23,1.12,0);box(.36,.83,.43,c.pants,0,-.42,0,leg);box(.39,.22,.64,'#f6f4e6',0,-.87,.09,leg);g.add(leg);limbs.push({arm,leg,side});}
for(const x of [-.15,.15])box(.065,.08,.025,'#293d42',x,2.49,.322);box(.18,.035,.025,'#8c5948',0,2.32,.325);
if(c.accessory==='cap'){box(.82,.22,.76,c.shirt,0,2.99,-.02);box(.85,.07,.4,c.shirt,0,2.9,.45);}
if(c.accessory==='backpack'){box(.68,.8,.35,'#c48e53',0,1.66,-.4);box(.24,.12,.12,'#ebd4a3',0,2.1,-.4);for(const x of [-.29,.29])box(.1,.82,.025,'#b88a56',x,1.65,.255);}
g.userData.limbs=limbs;return g;}
function dispose(group){const materials=new Set();group.traverse(o=>{if(o.isMesh){o.geometry.dispose();materials.add(o.material);}});materials.forEach(m=>m.dispose());}
window.BlockTownAvatar=Object.freeze({defaults,options,load,save,sanitize,create,dispose});
})();
