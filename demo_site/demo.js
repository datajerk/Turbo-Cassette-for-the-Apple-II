
//2017-09-17 Jorge Chamorro Bieling, jorge@jorgechamorro.com

window.onload= function boot () {

try {

// Cosas


Array.prototype.shuffle= function shuffle (a,b,i) {
    a= [];
    b= this;
    while (b.length) {
        i= rnd(b.length);
        a[a.length]= b[i];
        b.splice(i,1);
    }
    return a;
};


function $ (id) { return document.getElementById(id) }


function rnd (i) { return Math.floor(i* Math.random()) }
  

function rndStr (len) {
    var a= 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    var s= '';
    while (len--) s+= a[rnd(a.length)];
    return s;
}











// Player object

var player= (function nu_player () {

    var player= Object.create(null);
    var play_list= [];
    var playing= 0;
    
    function play () {
        if (!play_list.length) return;
        if (playing) return;
        
        playing= play_list[0];
        playing.audio_node.connect(audio_context.destination);
        playing.audio_node.onended= player_cb;
        console.log("PLAY");
        playing.audio_node.start();
    }
    
    function reset () {
        if (playing) playing.audio_node.disconnect(audio_context.destination);
        play_list= [];
        playing= 0;
    }
    
    function push (item) {
        play_list.push(item);
        play();
    }
    
    function player_cb () {
        if (!playing) return;
        playing.audio_node.disconnect(audio_context.destination);
        if (playing.cb) {
            try { playing.cb() } catch (e) { ; }
        }
        play_list.splice(0,1);
        playing= 0;
        play();
    }
    
    player.reset= reset;
    player.push= push;
    return player;
})();











// Audio cosas comunes

var invert= 0;
var playing= [];
var audio_context = new (window.AudioContext || window.webkitAudioContext)();    
var sample_rate= audio_context.sampleRate;


function silencio (how_much) {
    var s= '';
    while (how_much--) s+= '0';
    return s;
}


(function snd () {
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange= function orsc () {
        if (xhr.readyState != 4) return;
        setTimeout(snd, 60e3);
    };
    xhr.open("GET", "snd.txt?&s=" + rndStr(22), true);
    xhr.send(null);
})();


function play (samples, cb) {

    var channels= 1;
    var audio_buffer = audio_context.createBuffer(channels, samples.length, sample_rate);
    var channel_data= audio_buffer.getChannelData(0);
    var symbol2level= {H:1, h:0.5, 0:0, L:-1, l:-0.5};;
    if (invert) symbol2level= {H:-1, h:-0.5, 0:0, L:1, l:0.5};
    for (var i=0 ; i<samples.length ; i++) channel_data[i]= symbol2level[samples[i]];
    samples= '';
    var audio_node = audio_context.createBufferSource();
    audio_node.buffer= audio_buffer;
    var item= {audio_node:audio_node};
    if (cb) item.cb= cb;
    player.push(item);
}











// **** Audio turbo
    
function idle_turbo () {
    return 'LLLLLLLLLLLLHHHHHHHHHHH';
}


function sync_turbo () {
    return 'HHLLLLLLLLHHHHHHHLL';
};


function hex_to_samples_turbo (hex) {

    hex= hex.toLowerCase();
    var hex2dec= { 0:0, 1:1, 2:2, 3:3, 4:4, 5:5, 6:6, 7:7, 
                     8:8, 9:9, a:10, b:11, c:12, d:13, e:14, f:15 };
    
    var manchester= '';
    var bit2samples= { 0:'LLHH', 1:'HHLL' };
    for (var i=0 ; i<hex.length ; i++) {
        var nibble= hex2dec[hex[i]].toString(2);
        while (nibble.length<4) nibble= '0'+ nibble;
        for (var j=0 ; j<4 ; j++) manchester+= bit2samples[nibble[j]];
    }
    hex= '';
    
    var tweaked= '';
    var hi_ctr= 0;
    for (var i=0 ; i<manchester.length ; i++) {
        var c= manchester[i];
        if (c === 'L') {
            for (var j=1 ; j<hi_ctr ; j++) c= 'H'+ c;
            tweaked+= c;
            hi_ctr= 0;
        }
        else hi_ctr+= 1;
    }
    for (var j=1 ; j<hi_ctr ; j++) tweaked+= 'H';
    manchester= ''
    
    return tweaked;
}











// Audio normal


function applesoft_hex_to_samples (hex) {

    hex= hex.toLowerCase();
    
    //4s @770 + sync + bytes + eor(bytes)
    
    var samples= '';
    samples+= silencio(sample_rate/5);   //0.2 s
    samples+= header_770_normal(4);
    samples+= sync_bit_normal();
    samples+= applesoft_header(hex);
    samples+= end_cycle(samples);
    samples+= prolongar(sample_rate/10, samples);
    samples+= assembly_hex_to_samples(hex, 1);
    hex= '';
    
    return samples;
}


function assembly_hex_to_samples (hex, sin_silencio) {

    hex= hex.toLowerCase();
    
    //4s @770 + sync + bytes + eor(bytes)
    
    var samples= '';
    samples+= sin_silencio ? '' : silencio(sample_rate/5);   //0.2 s
    samples+= header_770_normal(4);
    samples+= sync_bit_normal();
    
    var eor= 0xff;
    var hex2dec= {0:0, 1:1, 2:2, 3:3, 4:4, 5:5, 6:6, 7:7, 8:8, 
                    9:9, a:10, b:11, c:12, d:13, e:14, f:15};
    for (var i=0 ; (i+1)<hex.length ; i+=2) {
        var hi_nibble= hex2dec[hex[i]];
        var lo_nibble= hex2dec[hex[i+1]];
        var byte= lo_nibble+ (16* hi_nibble);
        eor^= byte;
        samples+= byte_normal(byte);
    }
    hex= '';
    samples+= byte_normal(eor);
    samples+= end_cycle(samples);
    samples+= prolongar(10, samples);
    samples+= silencio(sample_rate/5);   //0.2 s
    
    return samples;
}


function header_770_normal (segundos) {
    // ~segundos @770 Hz
    var samples= '';
    var ciclos= 770*segundos;
    var samples_por_semiciclo= Math.round(sample_rate/(770*2));
    var samples_total= ciclos* (2*samples_por_semiciclo);
    for (var i=0 ; i<samples_total ; i++) {
        var bit= !(Math.floor(i/samples_por_semiciclo)%2);
        samples+= bit ? 'H' : 'L';
    }
    return samples;
}


function sync_bit_normal () {
    // 1 pulso de 200µs + 1 pulso de 250µs
    var samples= '';
    var up= Math.round(sample_rate*200e-6);
    var down= Math.round(sample_rate*250e-6);
    for (var i=0 ; i<up ; i++) samples+= 'H';
    for (var i=0 ; i<down ; i++) samples+= 'L';
    return samples;
}


function bit_nomal (bit) {
    var samples= '';
    var len= Math.round(sample_rate* (+bit ? 500e-6 : 250e-6));
    for (var i=0 ; i<len ; i++) samples+= 'H';
    for (var i=0 ; i<len ; i++) samples+= 'L';
    return samples;
}


function byte_normal (byte) {
    var samples= '';
    byte= byte.toString(2);
    while (byte.length<8) byte= '0'+ byte;
    for (var i=0 ; i<8 ; i++) samples+= bit_nomal(byte[i]);
    return samples;
}


function applesoft_header (hex) {
    var samples= '';
    var eor= 0xff;
    var lock= 0x80;
    var len= (hex.length/2)-1;
    var hi= Math.floor(len/256);
    var lo= len%256;
    eor^= lo;
    samples+= byte_normal(lo);
    eor^= hi;
    samples+= byte_normal(hi);
    eor^= lock;
    samples+= byte_normal(lock);
    samples+= byte_normal(eor);
    return samples;
}


function end_cycle (samples) {
    var last= samples[samples.length-1];
    return (last === 'H') ? 'L' : 'H';
}


function prolongar (n, samples) {
    var s= '';
    var last= samples[samples.length-1];
    for ( var i=0 ; i<n ; i++) s+= last;
    return s;
}


var prgm_applesoft= "14080a00b93231342c303a8c323038303a800000000a272727272727272727";


var prgm_assembly= "203aff8d10c020b009204608ad00c03005b0ed4c29088d10c0297fc91bd0e18d53c08d51c060a9208dc2088dd8084c640900a200a00838ad60c0305dad60c03058ad60c03053ad60c0304ead60c03049ad60c03044ad60c0303fad60c03040ad60c0303bad60c03036ad60c03031ad60c0302cad60c03027ad60c03022ad60c0301dad60c03018ad60c03013ad60c0300ead60c030094c47099004184cea08183e00203888d028e8f07da0084cf4089004184c5c08383e00203888d084e8f067a0084c6608ad60c010e5ad60c010e0ad60c010dbad60c010d6ad60c010d1ad60c010ccad60c010c7ad60c010c8ad60c010c3ad60c010bead60c010b9ad60c010b4ad60c010afad60c010aaad60c010a5ad60c010a0ad60c0109bad60c01096ad60c010914c4709c000d015e000d011aec208e8e040f00b8ec2088ed8084c640938601860ad30c0a209ad60c08d5108ad00c030ecad60c04d510810f3ad510810e3ca3007ad60c010f830d9a209ca30d4ad60c010f83000a209ca3007ad60c030f810c1a209ca30bcad60c030f84c520820e2f38d52c0a9018d9a3a8d3a268dba2d8dc1248d19378dc1208d42248d37378d3d3d8d3a228d9b338d9b3f8dbb288d9b3b8d373b8d363a8dba298d9a3e8d42308d363e8d9b378dbb2ca9028dbd208db733a9038db7238db73a8d3f308d383a8d42288d3f208d1a278d383e8dbb228db7368d5e288dbb308dbc298dbd248d422c8d3f2c8d3f288d1a2b8d38368d3a2a8d353b8d35338db6268db8228db8268dbc2d8dbb348d3a2e8dbc318d3f248d98338d352f8d373f8db6228d35378d1a23a9048d383ba9068d3c2d8d3f298d973b8d98278d973f8d3c29a9078dbd288d1a2f8d982f8db62a8db72e8d3f218d392b8db72f8d38328dbd218d382e8db72a8dbb388db82a8d193f8db62e8d982b8d382f8db72b8d983b8dbc398d98378dbd2c8db7328d352b8d5e248d3f348db7278db82e8dbc358d1a338dbb3c8d3a328d3b3e8d193ba9088dbc2ca90c8dbc348d1a3f8dbc30a90e8d3f3c8d382a8dbc3c8db63a8dbc388d3c228db8368d3c258d3c218d99278d1a3b8d3c318dbd348d40208d3c268db6368d1a378dbd308d3b25a90f8d39278dbc3d8d3e3d8d3b3a8db73e8db8328d5e208d3f388d3f258d983f8d38338d3b218d99238db6328d3a36a9188db6378d99228d9a238d9a27a91c8d3b268d3b2a8dbf288d3e388dbb398d3e348d3b2d8dbb3d8d992f8db62f8d36238db63e8dbf248dbd3c8dbd2d8d3b328dbb358d3b2e8db63b8d99268d3b228d4028a91e8d3b298dbd388db62b8d992b8d98238db63f8d40248dbf208d38378db83a8d3c358d3b36a91f8d39238d3e398d3a3a8dbd258d3723a9308db53ea9388d39368d3b358dbe208d99378d3e3c8d992e8d40308db6338d3d258db93a8d3b398d393aa9398dbf308dbf2ca93c8d3d218d99338d402c8d3b318db83e8db93e8d992aa93e8dbd298d3523a93f8d35278d3e318d3e35a9408dbe3c8db9218d34338d342f8d34378d41308d412c8d343f8dbe388d3e218dbc288dba388dba348dba288d192b8db5268d343b8db9258db52a8d3e258d37368dbc24a9418d37338d4220a9438dbc258dba25a9448d373aa9468db7228d373ea9478db726a94e8dbb318d3e2ca94f8dbb2d8db623a95c8d3932a95e8d3e308d392ea95f8db627a9608dbe2c8db9318d35328db9298d353e8d972b8d19278d41288d9a2f8dbe308d3e298db9398d363b8d3d398dc0208dc0248dba2c8dc0288d41248d19238dba308d3e248db9358db92d8d5d288d9a3f8d3d358db5228d5d208dbe34a9618d372f8d382b8db93da9638dbc21a9678dbb298d39228d363f8dbb25a96c8d3e28a96f8d392a8d3926a9708d38278d3e208db9368db92a8db83d8d18378dbe288d993f8dbe248d3d2d8d993a8db9268d35368d353a8d41208d993e8d393e8d36338dba268d40388d9a338d403c8d5d248db9228d3e2d8d9a378db9328db92e8d9a3b8d99368d3d318d3637a9718d3b3da9738dbf388dbb21a9778dbf3ca9788d38228d183b8d362f8d38238d362b8d3d298d993b8d40348d99328d972f8d3627a9798d372ba97b8d3c3d8dbf34a97c8dba228d183f8d3a398d9733a97e8d3c398d38268d3a3d8d3a3e8d9737a97f8d37278d353f8dba218db5238db52760000000";











// bootstrap


(function fill_body () {
    document.body.innerHTML= '<h1>TURBO-CASSETTE Demo</h1><h3 id="o_sample_rate">Sample rate is ¿?</h3><div>\n<input type="button" id="b_mute" value="  MUTE  ">\n<input type="button" id="b_load_applesoft" value=" ]LOAD  ">\n<input type="button" id="b_load_assembly" value=" *820.E3AR ">\n<input type="button" id="b_reset" value=" RESET ">\n<input type="button" id="b_invert" value=" NORMAL/INVERTED ">\n<input type="button" id="b_reload" value=" reload ">\n<input type="button" id="b_github" value=" goto github ">\n<input type="button" id="b_csa2" value=" goto c.s.a2 ">\n<input type="button" id="b_loop" value=" LOOP 4 EVER "></div>"';
})();


var fotos= [
    'homer 1.png',
    'homer 2.png',
    'homer 3.png',
    'homer 4.png',
    'homer 5.png',
    'homer 6.png',
    'homer 7.png',
    'homer 8.png',
    'f666.png',
    '6502.png',
    '6502.png',
    '6502.png'].shuffle();
    
fotos.forEach(setup);


function setup (src, idx, obj) {        
        
        var div= document.createElement('div');
        div.className= 'crop';
        var canvas= div.appendChild(document.createElement('canvas'));
        canvas.width= 280;
        canvas.height= 192;
        var img= document.createElement('img');
        img.onload= function onload (h,v) {
            img.onload= h= v= 0;
            if ((img.width>280) && (img.height>192)) {
                h= rnd(img.width-280);
                v= rnd(img.height-192);
            }
            canvas.getContext('2d').drawImage(img, -h, -v);
            div._hex_frames= foto2hex(canvas);
            div._get_samples= function get_samples () {
                var samples= '';
                samples+= silencio(sample_rate/10);
                for (var i=0 ; i<div._hex_frames.length ; i+=1) {
                    samples+= idle_turbo();
                    samples+= sync_turbo();
                    samples+= hex_to_samples_turbo(div._hex_frames[i]);
                }
                samples+= silencio(sample_rate/10);
                return samples;
            }
            div.onclick= function onclick () {
                player.reset();
                play(div._get_samples());
            }
        };
        img.src= src;
        div._img= img;
        div._canvas= canvas;
        document.body.appendChild(div);
        obj[idx]= div;


    function foto2hex (canvas) {
        var data= canvas.getContext('2d').getImageData(0,0,280,192);
        var bytes= [];
        for (var y=0 ; y<192 ; y+=1) {
            for (var x=0 ; x<280 ; x+=7) {
                var byte= 0;
                for (var i=6 ; i>=0 ; i-=1) {
                    var pixel= data.data[4*((y*280)+(x+i))];
                    byte= (2*byte)+ (pixel ? 1 : 0);
                }
                byte= byte.toString(16);
                while (byte.length<2) byte= '0'+ byte;
                bytes[get_hgr_offset(x,y)]= byte;
            }
        }
        var frames= [];
        for (var i=0 ; i<8192 ; i+=256) {
            var line= '';
            for (var j=0 ; j<256 ; j++) line+= bytes[i+j] ? bytes[i+j] : '00';
            frames.push(line);
        }
        return frames;
    }

    var hgr_offsets= [0, 1024, 2048, 3072, 4096, 5120, 6144, 7168, 128, 1152,
        2176, 3200, 4224, 5248, 6272, 7296, 256, 1280, 2304, 3328, 4352,
        5376, 6400, 7424, 384, 1408, 2432, 3456, 4480, 5504, 6528, 7552,
        512, 1536, 2560, 3584, 4608, 5632, 6656, 7680, 640, 1664, 2688,
        3712, 4736, 5760, 6784, 7808, 768, 1792, 2816, 3840, 4864, 5888,
        6912, 7936, 896, 1920, 2944, 3968, 4992, 6016, 7040, 8064, 40, 1064,
        2088, 3112, 4136, 5160, 6184, 7208, 168, 1192, 2216, 3240, 4264,
        5288, 6312, 7336, 296, 1320, 2344, 3368, 4392, 5416, 6440, 7464,
        424, 1448, 2472, 3496, 4520, 5544, 6568, 7592, 552, 1576, 2600, 
        3624, 4648, 5672, 6696, 7720, 680, 1704, 2728, 3752, 4776, 5800,
        6824, 7848, 808, 1832, 2856, 3880, 4904, 5928, 6952, 7976, 936, 
        1960, 2984, 4008, 5032, 6056, 7080, 8104, 80, 1104, 2128, 3152,
        4176, 5200, 6224, 7248, 208, 1232, 2256, 3280, 4304, 5328, 6352, 
        7376, 336, 1360, 2384, 3408, 4432, 5456, 6480, 7504, 464, 1488, 
        2512, 3536, 4560, 5584, 6608, 7632, 592, 1616, 2640, 3664, 4688,
        5712, 6736, 7760, 720, 1744, 2768, 3792, 4816, 5840, 6864, 7888, 
        848, 1872, 2896, 3920, 4944, 5968, 6992, 8016, 976, 2000, 3024,
        4048, 5072, 6096, 7120, 8144];
        
    function get_hgr_offset (x,y) {
        return hgr_offsets[y]+ Math.floor(x/7);
    }
    
}











// Listeners

(function setup_listeners () {

    $("b_mute").onclick= player.reset;
    
    $("b_load_applesoft").onclick= function () {
        player.reset();
        play(applesoft_hex_to_samples(prgm_applesoft+prgm_assembly));
    };

    $("b_load_assembly").onclick= function () {
        player.reset();
        play(assembly_hex_to_samples(prgm_assembly));
    };
    
    $("b_reset").onclick= function () {
        player.reset();
        var samples= '';
        samples+= silencio(sample_rate/10);
        samples+= idle_turbo();
        samples+= sync_turbo();
        samples+= prolongar(10, samples);
        samples+= silencio(sample_rate/10);
        play(samples);
    };
    
    $("b_invert").onclick= function () {
        player.reset();
        invert= !invert;
        $("b_invert").value= invert ? 'NOW INVERTED' : 'NOW NOT INVERTED';
    };
    
    $("b_reload").onclick= function () { location.reload() };
    
    $("b_github").onclick= function () { location.href= 'https://github.com/xk/Turbo-Cassette-for-the-Apple-II' };
    
    $("b_csa2").onclick= function () { location.href= 'https://groups.google.com/forum/#!topic/comp.sys.apple2/V_S7-0pv3CA/discussion' };
    
    $("b_loop").onclick= function () {
        player.reset();
        var ctr= 0;
        var start_t= Date.now();
        var last= rnd(fotos.length);
        play(fotos[last]._get_samples(), cb);
        function cb (i) {
            ctr+= 1;
            var t= (Date.now()- start_t)/ 1e3;
            
            do { i= rnd(fotos.length); } while (i === last);
            play(fotos[last=i]._get_samples(), cb);
            
            var average= (ctr*8)/t;
            var bps= Math.round(average*1024*8);
            var msg= ctr+ " played. Average xfer rate "+ Math.round(average*100)/100;
            msg+= " kbytes per second ("+ bps+ " bps)";
            console.log(msg);
        }
    };
    
    $("o_sample_rate").innerHTML= "Sample rate is "+ sample_rate+ " sps";
    
})();

}
catch (e) {
    document.getElementById('msg').innerHTML= 'JavaScript:<br>'+ e+ '<br><br>(try with another browser)';
}

};