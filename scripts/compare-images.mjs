// Analysis-only, pixel-preserving comparison sheets. Source artifacts are unchanged.
import { connect } from "./cdp.mjs";
import path from "node:path";
const main = await connect(9346, "main");
try {
  const files = [
    path.resolve("../design/concepts/workshop-dark.png"),
    path.resolve("validation/10-final-workshop.png"),
  ];
  await main.evaluate(
    `(()=>{const {nativeImage,BrowserWindow}=process.mainModule.require('electron'),fs=process.mainModule.require('node:fs');const images=${JSON.stringify(files)}.map(p=>nativeImage.createFromPath(p));const width=1487,height=1058,bitmaps=images.map(i=>i.toBitmap());const full=Buffer.alloc(width*2*height*4);for(let y=0;y<height;y++)for(let i=0;i<2;i++)bitmaps[i].copy(full,(y*width*2+i*width)*4,y*width*4,(y+1)*width*4);fs.writeFileSync(${JSON.stringify(path.resolve("validation/comparison.png"))},nativeImage.createFromBitmap(full,{width:width*2,height}).toPNG());const header=Buffer.alloc(width*400*4);bitmaps[0].copy(header,0,0,width*200*4);bitmaps[1].copy(header,width*200*4,0,width*200*4);fs.writeFileSync(${JSON.stringify(path.resolve("validation/comparison-header.png"))},nativeImage.createFromBitmap(header,{width,height:400}).toPNG());for(const w of BrowserWindow.getAllWindows())if(w.webContents.getURL().includes('/validation/comparison'))w.destroy();return true})()`,
  );
  console.log(
    "Pixel-preserving side-by-side full comparison and stacked 1:1 headers saved.",
  );
} finally {
  main.close();
}
