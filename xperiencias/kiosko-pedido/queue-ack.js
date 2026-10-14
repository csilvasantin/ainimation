(function(root){
  async function request(fetcher,url,options={}){
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),8000);
    try{const response=await fetcher(url,{...options,signal:controller.signal});if(!response.ok)throw Error('Queue request rejected');const value=await response.json();if(!value||value.ok!==true)throw Error('Queue did not acknowledge');return value;}finally{clearTimeout(timeout);}
  }
  function number(value,id){if(!value||value.ok!==true||!/^\p{L}{1,3}\d{3}$/u.test(String(value.numero||''))||value.id!==id)throw Error('Invalid queue acknowledgement');return value.numero;}
  function paid(value,id){number(value,id);if(!["recibido","preparando","listo","recogido"].includes(value.estado))throw Error("Payment not acknowledged");return value;}
  root.KioskoQueueAck=Object.freeze({request,number,paid});
})(globalThis);
