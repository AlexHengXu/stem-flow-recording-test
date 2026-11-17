const fs=require('node:fs'),path=require('node:path');
module.exports=()=>{
 if(process.env.STEM_TEST_HTML)return fs.readFileSync(process.env.STEM_TEST_HTML,'utf8');
 const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
 return html.replace(/<script src="(js\/[^"]+)"><\/script>/g,(_,src)=>'<script>\n'+fs.readFileSync(path.join(__dirname,src.split('?')[0]),'utf8')+'\n</script>');
};
