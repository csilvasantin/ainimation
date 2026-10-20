"""Connect a dedicated/free bot whose token already exists in the vault. Never prints credentials."""
import json, os, pathlib, re, secrets, subprocess, sys, urllib.request
root=pathlib.Path(__file__).resolve().parents[2]
vault='/Users/csilvasantin/Claude/admira-vault/vault-get.sh'
def secret(name):return subprocess.check_output(['bash',vault,name],text=True,stderr=subprocess.DEVNULL).strip()
name=sys.argv[1] if len(sys.argv)>1 else 'AINIMATION_TELEGRAM_BOT_TOKEN'
token=secret(name)
def tg(method,data=None):
 req=urllib.request.Request('https://api.telegram.org/bot'+token+'/'+method,data=json.dumps(data or {}).encode(),headers={'Content-Type':'application/json'})
 with urllib.request.urlopen(req,timeout=30) as r: result=json.load(r)
 if not result.get('ok'):raise SystemExit('Telegram rechazó la configuración; no se ha mostrado el token.')
 return result['result']
me=tg('getMe');preview='https://ainimation-interactive-library-preview.csilvasantin.workers.dev';url=preview+'/api/telegram/webhook';current=tg('getWebhookInfo')
if current.get('url') and current['url']!=url:raise SystemExit('El bot tiene un webhook ajeno activo. No se ha cambiado. Elige un bot libre.')
config=root/'cloud-library/wrangler.preview.toml';text=config.read_text();username=me['username']
if 'TELEGRAM_BOT_USERNAME' in text:text=re.sub(r'TELEGRAM_BOT_USERNAME = "[^"]*"','TELEGRAM_BOT_USERNAME = "'+username+'"',text)
else:text=text.replace('[vars]','[vars]\nTELEGRAM_BOT_USERNAME = "'+username+'"')
config.write_text(text);env=os.environ.copy();env['CLOUDFLARE_API_TOKEN']=secret('CLOUDFLARE_API_TOKEN');env['CLOUDFLARE_ACCOUNT_ID']='5b14266aa29050f8e5acd442c61b9783'
webhook_secret=secrets.token_hex(32)
for key,value in [('TELEGRAM_BOT_TOKEN',token),('TELEGRAM_WEBHOOK_SECRET',webhook_secret)]:
 p=subprocess.run(['npx','--yes','wrangler@4.81.1','secret','put',key,'--config',str(config)],input=value+'\n',text=True,env=env,cwd=root,capture_output=True)
 if p.returncode:raise SystemExit('No se pudo configurar el secreto '+key+'. No se registró webhook.')
p=subprocess.run(['npx','--yes','wrangler@4.81.1','deploy','--config',str(config)],text=True,env=env,cwd=root,capture_output=True)
if p.returncode:raise SystemExit('No se pudo desplegar la vista previa; webhook no registrado.')
tg('setWebhook',{'url':url,'secret_token':webhook_secret,'allowed_updates':['message'],'max_connections':1,'drop_pending_updates':False})
tg('setMyCommands',{'commands':[{'command':'start','description':'Vincular mi cuenta de AINimation'},{'command':'help','description':'Ver cómo enviar las imágenes'},{'command':'nuevo','description':'Empezar un lote de imágenes'},{'command':'terminar','description':'Terminar la subida y revisar en AINimation'}]})
status=tg('getWebhookInfo');print(json.dumps({'bot':'@'+username,'webhookCorrect':status.get('url')==url,'pendingUpdates':status.get('pending_update_count')},ensure_ascii=False))
