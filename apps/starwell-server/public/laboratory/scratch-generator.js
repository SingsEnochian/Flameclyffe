import * as THREE from '/vendor/three/three.module.min.js';

export function generateScratchTexture(size = 512, scratchCount = 120) {
  const canvas = document.createElement('canvas'); canvas.width = size; canvas.height = size;
  const context = canvas.getContext('2d'); context.fillStyle = '#111'; context.fillRect(0, 0, size, size); context.lineWidth = 0.5;
  for (let index = 0; index < scratchCount; index += 1) {
    const x=Math.random()*size,y=Math.random()*size,length=10+Math.random()*40,angle=Math.random()*Math.PI*2;
    context.strokeStyle=`rgba(255,255,255,${0.15+Math.random()*0.35})`;context.beginPath();context.moveTo(x,y);context.lineTo(x+Math.cos(angle)*length,y+Math.sin(angle)*length);context.stroke();
  }
  const texture=new THREE.CanvasTexture(canvas);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(2,2);return texture;
}
