import {validateCafeteria,basketDefaults} from './interactive-cafeteria.mjs?v=director-cafe-3';
// Shared by Creator and Director: edits retain IDs, artwork and reference metadata.
export function mountCafeEditor(host,catalog,onChange=()=>{},lang='es'){
 const readers=[];const doc=host.ownerDocument,t=(es,en)=>lang==='en'?en:es;host.replaceChildren();host.classList.add('cafe-editor');
 const node=(tag,text)=>{const n=doc.createElement(tag);if(text)n.textContent=text;return n;};
 const field=(parent,obj,key,label,{type='text',max=100,choices,min,step}={})=>{const l=node('label',label),input=node(choices?'select':'input');if(choices){for(const [value,text]of choices){const o=node('option',text);o.value=value;input.append(o);}}else{input.type=type;input.maxLength=max;if(min!==undefined)input.min=min;if(step)input.step=step;}
 if(type==='checkbox')input.checked=obj[key];else input.value=type==='number'&&key==='price'?(obj[key]/100).toFixed(2):obj[key];
 input.oninput=()=>{obj[key]=type==='checkbox'?input.checked:type==='number'?(key==='price'?(/^(?:\d+)(?:[.,]\d{1,2})?$/.test(input.value)?Math.round(Number(input.value)*100):NaN):Number(input.value)):input.value;};
 readers.push(input.oninput);input.onchange=()=>{input.oninput();onChange();};l.append(input);parent.append(l);return input;};
 const group=(name,open=false)=>{const d=node('details'),s=node('summary',name);d.open=open;d.append(s);host.append(d);return d;};
 const basket=group(t('Cesta','Basket'),true),b={...basketDefaults,...catalog.basket};
 const beforeBasket=JSON.stringify(b);
 const basketChanged=()=>{catalog.basket={...catalog.basket,...b};onChange();};
 for(const [key,es,en]of [['title','Título de la cesta','Basket title'],['emptyText','Mensaje de cesta vacía','Empty basket message'],['checkoutLabel','Botón de continuar','Checkout button']]){const input=field(basket,b,key,t(es,en));input.onchange=()=>{input.oninput();basketChanged();};}
 const limit=field(basket,b,'maxQuantity',t('Máximo de unidades por línea','Maximum units per line'),{type:'number',min:1,step:1});limit.max='20';limit.onchange=()=>{limit.oninput();basketChanged();};
 const merge=field(basket,b,'mergeIdentical',t('Agrupar productos con las mismas opciones','Merge products with identical options'),{type:'checkbox'});merge.onchange=()=>{merge.oninput();basketChanged();};
 host.append(node('h3',t('Categorías','Categories')));
 for(const category of catalog.categories){const d=group(category.name);field(d,category,'name',t('Nombre de categoría','Category name'),{max:60});field(d,category,'subtitle',t('Descripción de categoría','Category description'));}
 host.append(node('h3',t('Productos','Products')));
 for(const product of catalog.products){const d=group(product.name+' · '+(product.price/100).toFixed(2)+' €');d.dataset.productId=product.id;
 for(const [key,es,en,max]of [['name','Nombre del producto','Product name',80],['description','Descripción','Description',240],['group','Familia','Family',40]])field(d,product,key,t(es,en),{max});
 const price=field(d,product,'price',t('Precio en euros','Price in euros'),{type:'number',min:0,step:'0.01'});price.max='1000';
 field(d,product,'category',t('Categoría','Category'),{choices:catalog.categories.map(c=>[c.id,c.name])});
 field(d,product,'customization',t('Opciones del producto','Product options'),{choices:[['plain',t('Sin opciones','No options')],['milk',t('Leche, temperatura y miel','Milk, temperature and honey')],['coffee',t('Café, leche, temperatura y miel','Coffee, milk, temperature and honey')]]});
 field(d,product,'available',t('Disponible en el catálogo','Available in catalog'),{type:'checkbox'});
 d.addEventListener('change',()=>{d.querySelector('summary').textContent=product.name+' · '+(product.price/100).toFixed(2)+' €';});}
 return {read:()=>{for(const read of readers)read();if(JSON.stringify(b)!==beforeBasket)catalog.basket={...catalog.basket,...b};return validateCafeteria(catalog);}};
}
