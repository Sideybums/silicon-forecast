export const site = {
  name: "Silicon Forecast",
  description: "An independent project building clearer, evidence-backed views of UK PC component prices over time.",
  domain: "siliconforecast.com",
  contactEmail: "hello@siliconforecast.com",
  status: "Public research preview",
};
export const categories = [
 {slug:"ram",shortName:"RAM",name:"Memory (RAM)",status:"Retail evidence build",marker:"16 monitored kits",summary:"Capacity, DDR generation, kit configuration and speed.",detail:"Our first methodology focuses narrowly on 32GB (2×16GB) DDR5 desktop memory kits sold from retailer-owned UK stock. Exact identity, VAT-inclusive landed price and purchasable state must be established before publication.",considerations:["Capacity and module count must match exactly","Desktop UDIMM and laptop SO-DIMM products are kept separate","Speed, timings, model and manufacturer identifiers matter","Coverage limitations remain visible rather than being filled with estimates"]},
 {slug:"gpu",shortName:"GPUs",name:"Graphics cards",status:"Planned",marker:"No tracked prices yet",summary:"GPU model, VRAM and board-partner variants.",detail:"Graphics-card coverage is planned only after the initial memory index proves dependable. GPU pricing needs careful separation of reference models, board-partner variants, memory capacities and seller condition.",considerations:["GPU model and VRAM capacity","Board-partner and cooler variants","New retail stock only","Bundles and seller-of-record ambiguity require separate treatment"]},
 {slug:"cpu",shortName:"CPUs",name:"Processors",status:"Planned",marker:"No tracked prices yet",summary:"Desktop processor families, sockets and package types.",detail:"Processor coverage is planned for a later phase. A reliable comparison must distinguish generations, sockets, boxed and tray products, and products bundled with coolers or other hardware.",considerations:["Manufacturer, family and exact model","Socket and generation","Retail boxed and tray products","Bundles and included coolers"]},
 {slug:"ssd",shortName:"SSDs",name:"Solid-state drives",status:"Planned",marker:"No tracked prices yet",summary:"Capacity, interface, form factor and endurance class.",detail:"SSD coverage is planned after the first index is proven. Capacity alone is not enough: interface, form factor, controller revisions and endurance can materially change what appears to be the same product.",considerations:["Usable capacity and product family","NVMe or SATA interface","M.2 or 2.5-inch form factor","Hardware revisions and bundled heatsinks"]}
] as const;
