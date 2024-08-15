//===========================GLOBALS/INIT
DB_DIR:"/Users/michael/q/projects/Memories-master/db"
IMG_SRC:"/Users/michael/q/projects/Memories-master/images/"
.h.HOME:"/Users/michael/q/projects/Memories-master/html"
TEMP_FILE:"/Users/michael/q/projects/Memories-master/temp/tmp"
PORT:"50667"
MONTH_MAP:("0"^-2$string[(1+til 12)])!string(`January`February`March`April`May`June`July`August`September`October`November`December)
USR_MSGS:(!). flip 2 cut(
  `welcome;  "Welcome to our memories. You have sucessfully connected to your personal database. Feel free to upload new memories or take a journey through our past.")
//NOTE dev line below
\e 1
\c 20 140
//===========================UTILS
logm:{-1("@"sv string(x;y))," - ",string[.z.T]," - ",z;}[.z.u;.z.h;]
prettyDate:{"-"sv'reverse each .["."vs'string[x];;{MONTH_MAP[x]}](til count x;1)}
prettyTime:{$[any w:x=00:00 12:00;@[string[x];0 1;:;"12"],("am";"pm")first where w;$[x<12:00;string[x],"am";string[x-12:00],"pm"]]}
readImg:{upper raze each string read1 each hsym`$x}
path4id:{IMG_SRC,"/",exec first img from memories where link=x}
prepResp:{-8!.j.j x}
userMsg:{[level;head;body] (`notifyUser;`category`head`body!(level;head;body))}
//===========================WEB FUNCTIONS
getImage:{[imgnum;imgid]
 /imgnum is 0-6, imgid is 0-count memories
 memid:"memories_picture",imgid;
 logm"Image requested: ",memid;
 imgs:select from memories where link=`$memid;
 if[not count imgs;:(`noImage;"Fill holder with something else");];
 imgs:update prettyDate[date],prettyTime'[time],blob:readImg[IMG_SRC,/:img]from imgs;
 :(`renderPortfolio;(`$enlist"img",imgnum)!imgs);
 }

addNewUpload:{[data]
 .mk.d:data;
 logm"New image has been uploaded. Parsing user defined img info and adding to db";
 tplate:enlist`date`time`title`location`who`description!("DU*SS*";csv)0:csv sv data`date`time`title`loc`subjs`descr;
 fname:(lnk:"memories_picture",string[count memories]),".",last "."vs data`fName;
 tplate:update dateadded:.z.D,timeadded:`minute$.z.T,link:`$lnk,img:enlist fname from tplate;
 tplate:(cols memories)xcols tplate;
 .Q.dd[hsym`$DB_DIR;`memories`]upsert .Q.en[hsym`$DB_DIR;]tplate;
 logm"Successfully added information to db. Storing base64 to temp file";
 hsym[`$TEMP_FILE]0: enlist last csv vs data`data;
 logm"Decoding data and storing image";
 (hsym`$pth:IMG_SRC,fname)0: system"base64 -d -i ",TEMP_FILE;
 logm"Successfully saved image to ",pth;
 logm"Reloading db changes and notifying users of update";
 system["l ",DB_DIR];
 neg[.mem.users]@\:prepResp[(`numImages;count memories)];
 :userMsg[`info;"Image Uploaded";"Your image has been successfully uploaded"];
 }

init:{
 logm"Initialising process - opening port and loading db";
 system["p ",PORT];
 //DEV -NO FILES in DB CREATE THEM
 t:enlist`date`time`title`location`who`description`dateadded`timeadded`link`fname!(.z.D;.z.T;"Test";`:somewhere;`michael;"A fine file";.z.D;.z.T;`$"memories_picture1";"memories_picture1.lol");
 system["l ",DB_DIR];
 logm"Successfully initialised process. Connect: http://",string[.z.h],":",PORT,"/index.html";
 }

//===========================HANDLERS
.z.wc:{ .mem.users_:x;}

.z.wo:{
 .mem.users,:x;
 neg[x]prepResp[(`numImages;count memories)];
 neg[x]prepResp[userMsg[`info;"Welcome!";USR_MSGS[`welcome]]];
 }

.z.ws:{
 qry:@[.j.k -9!x;`func;`$]`func`params;
 res:(.). qry;
 neg[.z.w]prepResp[res];
 }
//===========================KICKSTART
init[]
