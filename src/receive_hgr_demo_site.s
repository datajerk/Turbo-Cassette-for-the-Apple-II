
; Apple II TURBO CASSETTE LOADER
; 13569 bps @44100 sps
; 14769 bps @48000 sps
; Jorge Chamorro Bieling, SEPT 2017
; jorge@jorgechamorro.com

; See the thread "Gentlemen, 14+ kbps" @ comp.sys.apple2 :
; https://groups.google.com/forum/#!topic/comp.sys.apple2/V_S7-0pv3CA/discussion
; Source files: github.com/xk/Turbo-Cassette-for-the-Apple-II
; Compile with: apple2.duckdns.org/assembler/
; Connect the PC to the Apple II cassette in port, set the volume at 50% or more.
; Transfer directly from the assembler page to the Apple II and then 820G
; Go to the demo page at: apple2.duckdns.org/turbodemo/
; Click on an image to xfer it
; On the Apple II the space bar resets the decoder an clears the HGR screen, ESC quits.
; Report issues on c.s.a2 or @ the github repo.

*           = $820

buffer      = $2000
spkr        = $c030
cout        = $fded
hgr         = $f3e2
bell        = $ff3a

bits        = 8
sync_min    = 9
sync_max    = 9

reset       jsr bell
            sta $c010
            jsr skookum
            
entry       jsr go
            lda $c000
            bmi key
            bcs reset
            jmp entry
            
key         sta $c010
            and #$7f
            cmp #27             ;ESC is quit
            bne reset           ;any other key is reset
            sta $c053
            sta $c051
            rts

go          lda #>buffer
            sta buffer_hi_1
            sta buffer_hi_2
            jmp sync

last_sample
.byte 0

decode      ldx #0              ;x= buffer index
            ldy #bits           ;y= bit number
            sec                 ;C means last edge was a clock

sample_lo   lda $c060           ;4
            bmi short_lo        ;2..3
sl_1        lda $c060           ;4
            bmi short_lo        ;2..3
sl_2        lda $c060           ;4
            bmi short_lo        ;2..3
sl_3        lda $c060           ;4
            bmi short_lo        ;2..3
sl_4        lda $c060           ;4
            bmi short_lo        ;2..3
sl_5        lda $c060           ;4
            bmi short_lo        ;2..3
sl_6        lda $c060           ;4
            bmi short_lo        ;2..3
w_hi_clk    lda $c060           ;4
            bmi clk_rising      ;2..3
hi_clk_1    lda $c060           ;4
            bmi clk_rising      ;2..3
hi_clk_2    lda $c060           ;4
            bmi clk_rising      ;2..3
hi_clk_3    lda $c060           ;4
            bmi clk_rising      ;2..3
hi_clk_4    lda $c060           ;4
            bmi clk_rising      ;2..3
hi_clk_5    lda $c060           ;4
            bmi clk_rising      ;2..3
hi_clk_6    lda $c060           ;4
            bmi clk_rising      ;2..3
hi_clk_7    lda $c060           ;4
            bmi clk_rising      ;2..3
hi_clk_8    lda $c060           ;4
            bmi clk_rising      ;2..3
hi_clk_9    lda $c060           ;4
            bmi clk_rising      ;2..3
hi_clk_10   lda $c060           ;4
            bmi clk_rising      ;2..3
hi_clk_11   lda $c060           ;4
            bmi clk_rising      ;2..3
            jmp eof_frame


short_lo    bcc clk_rising
            clc
            jmp sh_1
clk_rising  clc                 ;2      rising edge es un 0
.byte       $3e                 ;7 rol buffer,x        ;7
.byte       <buffer
buffer_hi_1
.byte       >buffer
            sec
            dey
            bne sh_2
            inx
            beq eof_frame
            ldy #bits
            jmp sh_3


short_hi    bcc clk_falling     ;2..3
            clc                 ;2
            jmp sl_1            ;3
clk_falling sec                 ;2      falling edge es un 1
.byte       $3e                 ;7 rol buffer,x        ;7
.byte       <buffer
buffer_hi_2
.byte       >buffer
            sec
            dey                 ;2
            bne sl_2            ;2..3
            inx
            beq eof_frame
            ldy #bits
            jmp sl_3            ;4
            

sample_hi   lda $c060           ;4
            bpl short_hi        ;2..3
sh_1        lda $c060           ;4
            bpl short_hi        ;2..3
sh_2        lda $c060           ;4
            bpl short_hi        ;2..3
sh_3        lda $c060           ;4
            bpl short_hi        ;2..3
sh_4        lda $c060           ;4
            bpl short_hi        ;2..3
sh_5        lda $c060           ;4
            bpl short_hi        ;2..3
sh_6        lda $c060           ;4
            bpl short_hi        ;2..3
w_lo_clk    lda $c060           ;4
            bpl clk_falling     ;2..3
lo_clk_1    lda $c060           ;4
            bpl clk_falling     ;2..3
lo_clk_2    lda $c060           ;4
            bpl clk_falling     ;2..3
lo_clk_3    lda $c060           ;4
            bpl clk_falling     ;2..3
lo_clk_4    lda $c060           ;4
            bpl clk_falling     ;2..3
lo_clk_5    lda $c060           ;4
            bpl clk_falling     ;2..3
lo_clk_6    lda $c060           ;4
            bpl clk_falling     ;2..3
lo_clk_7    lda $c060           ;4
            bpl clk_falling     ;2..3
lo_clk_8    lda $c060           ;4
            bpl clk_falling     ;2..3
lo_clk_9    lda $c060           ;4
            bpl clk_falling     ;2..3
lo_clk_10   lda $c060           ;4
            bpl clk_falling     ;2..3
lo_clk_11   lda $c060           ;4
            bpl clk_falling     ;2..3
            jmp eof_frame


eof_frame   cpy #0
            bne quit_err
            cpx #0
            bne quit_err
ok          ldx buffer_hi_1
            inx
            cpx #$40
            beq quit_ok
            stx buffer_hi_1     ;self-modifying code FTW
            stx buffer_hi_2
            jmp sync
            
quit_err    sec
            rts

quit_ok     clc
            rts


;ALGORITMO DE SYNC:
;1.- buscar un falling edge
;2.- contar bucles hasta el próximo flanco
;3.- si son más de sync_max o menos de sync_min goto 1
;4.- si son entre sync_min y sync_max => ok, y si ocurren 2 seguidos => ok: Al final del segundo empiezan los datos.
;5.- si el último pulso da error probablemente la señal esté invertida.
;6.- los samples de los pulsos de sync serían LLLLLLLLHHHHHHHLL (8L7H2L)


sync        lda spkr
            ldx #sync_min
            
            lda $c060
            sta last_sample
wait_edge   lda $c000
            bmi quit_err
no_key      lda $c060
            eor last_sample
            bpl wait_edge
            lda last_sample
            bpl sync            ;buscamos falling edge
            
sync_1_1    dex
            bmi sync_2          ;min length ok
            lda $c060
            bpl sync_1_1
            bmi sync            ;too short
            
sync_2      ldx #sync_max
sync_2_1    dex
            bmi sync            ;too long
            lda $c060
            bpl sync_2_1
            bmi sync_3
            
;1st pulse (LO) ok

sync_3      ldx #sync_min
sync_3_1    dex
            bmi sync_4          ;min length ok
            lda $c060
            bmi sync_3_1
            bpl sync            ;too short
            
sync_4      ldx #sync_max
sync_4_1    dex
            bmi sync            ;too long
            lda $c060
            bmi sync_4_1
            jmp decode          ;2nd pulse (HI) ok

skookum     jsr hgr
            sta $c052
            lda #1
            sta $3a9a
            sta $263a
            sta $2dba
            sta $24c1
            sta $3719
            sta $20c1
            sta $2442
            sta $3737
            sta $3d3d
            sta $223a
            sta $339b
            sta $3f9b
            sta $28bb
            sta $3b9b
            sta $3b37
            sta $3a36
            sta $29ba
            sta $3e9a
            sta $3042
            sta $3e36
            sta $379b
            sta $2cbb
            lda #2
            sta $20bd
            sta $33b7
            lda #3
            sta $23b7
            sta $3ab7
            sta $303f
            sta $3a38
            sta $2842
            sta $203f
            sta $271a
            sta $3e38
            sta $22bb
            sta $36b7
            sta $285e
            sta $30bb
            sta $29bc
            sta $24bd
            sta $2c42
            sta $2c3f
            sta $283f
            sta $2b1a
            sta $3638
            sta $2a3a
            sta $3b35
            sta $3335
            sta $26b6
            sta $22b8
            sta $26b8
            sta $2dbc
            sta $34bb
            sta $2e3a
            sta $31bc
            sta $243f
            sta $3398
            sta $2f35
            sta $3f37
            sta $22b6
            sta $3735
            sta $231a
            lda #4
            sta $3b38
            lda #6
            sta $2d3c
            sta $293f
            sta $3b97
            sta $2798
            sta $3f97
            sta $293c
            lda #7
            sta $28bd
            sta $2f1a
            sta $2f98
            sta $2ab6
            sta $2eb7
            sta $213f
            sta $2b39
            sta $2fb7
            sta $3238
            sta $21bd
            sta $2e38
            sta $2ab7
            sta $38bb
            sta $2ab8
            sta $3f19
            sta $2eb6
            sta $2b98
            sta $2f38
            sta $2bb7
            sta $3b98
            sta $39bc
            sta $3798
            sta $2cbd
            sta $32b7
            sta $2b35
            sta $245e
            sta $343f
            sta $27b7
            sta $2eb8
            sta $35bc
            sta $331a
            sta $3cbb
            sta $323a
            sta $3e3b
            sta $3b19
            lda #8
            sta $2cbc
            lda #12
            sta $34bc
            sta $3f1a
            sta $30bc
            lda #14
            sta $3c3f
            sta $2a38
            sta $3cbc
            sta $3ab6
            sta $38bc
            sta $223c
            sta $36b8
            sta $253c
            sta $213c
            sta $2799
            sta $3b1a
            sta $313c
            sta $34bd
            sta $2040
            sta $263c
            sta $36b6
            sta $371a
            sta $30bd
            sta $253b
            lda #15
            sta $2739
            sta $3dbc
            sta $3d3e
            sta $3a3b
            sta $3eb7
            sta $32b8
            sta $205e
            sta $383f
            sta $253f
            sta $3f98
            sta $3338
            sta $213b
            sta $2399
            sta $32b6
            sta $363a
            lda #24
            sta $37b6
            sta $2299
            sta $239a
            sta $279a
            lda #28
            sta $263b
            sta $2a3b
            sta $28bf
            sta $383e
            sta $39bb
            sta $343e
            sta $2d3b
            sta $3dbb
            sta $2f99
            sta $2fb6
            sta $2336
            sta $3eb6
            sta $24bf
            sta $3cbd
            sta $2dbd
            sta $323b
            sta $35bb
            sta $2e3b
            sta $3bb6
            sta $2699
            sta $223b
            sta $2840
            lda #30
            sta $293b
            sta $38bd
            sta $2bb6
            sta $2b99
            sta $2398
            sta $3fb6
            sta $2440
            sta $20bf
            sta $3738
            sta $3ab8
            sta $353c
            sta $363b
            lda #31
            sta $2339
            sta $393e
            sta $3a3a
            sta $25bd
            sta $2337
            lda #48
            sta $3eb5
            lda #56
            sta $3639
            sta $353b
            sta $20be
            sta $3799
            sta $3c3e
            sta $2e99
            sta $3040
            sta $33b6
            sta $253d
            sta $3ab9
            sta $393b
            sta $3a39
            lda #57
            sta $30bf
            sta $2cbf
            lda #60
            sta $213d
            sta $3399
            sta $2c40
            sta $313b
            sta $3eb8
            sta $3eb9
            sta $2a99
            lda #62
            sta $29bd
            sta $2335
            lda #63
            sta $2735
            sta $313e
            sta $353e
            lda #64
            sta $3cbe
            sta $21b9
            sta $3334
            sta $2f34
            sta $3734
            sta $3041
            sta $2c41
            sta $3f34
            sta $38be
            sta $213e
            sta $28bc
            sta $38ba
            sta $34ba
            sta $28ba
            sta $2b19
            sta $26b5
            sta $3b34
            sta $25b9
            sta $2ab5
            sta $253e
            sta $3637
            sta $24bc
            lda #65
            sta $3337
            sta $2042
            lda #67
            sta $25bc
            sta $25ba
            lda #68
            sta $3a37
            lda #70
            sta $22b7
            sta $3e37
            lda #71
            sta $26b7
            lda #78
            sta $31bb
            sta $2c3e
            lda #79
            sta $2dbb
            sta $23b6
            lda #92
            sta $3239
            lda #94
            sta $303e
            sta $2e39
            lda #95
            sta $27b6
            lda #96
            sta $2cbe
            sta $31b9
            sta $3235
            sta $29b9
            sta $3e35
            sta $2b97
            sta $2719
            sta $2841
            sta $2f9a
            sta $30be
            sta $293e
            sta $39b9
            sta $3b36
            sta $393d
            sta $20c0
            sta $24c0
            sta $2cba
            sta $28c0
            sta $2441
            sta $2319
            sta $30ba
            sta $243e
            sta $35b9
            sta $2db9
            sta $285d
            sta $3f9a
            sta $353d
            sta $22b5
            sta $205d
            sta $34be
            lda #97
            sta $2f37
            sta $2b38
            sta $3db9
            lda #99
            sta $21bc
            lda #103
            sta $29bb
            sta $2239
            sta $3f36
            sta $25bb
            lda #108
            sta $283e
            lda #111
            sta $2a39
            sta $2639
            lda #112
            sta $2738
            sta $203e
            sta $36b9
            sta $2ab9
            sta $3db8
            sta $3718
            sta $28be
            sta $3f99
            sta $24be
            sta $2d3d
            sta $3a99
            sta $26b9
            sta $3635
            sta $3a35
            sta $2041
            sta $3e99
            sta $3e39
            sta $3336
            sta $26ba
            sta $3840
            sta $339a
            sta $3c40
            sta $245d
            sta $22b9
            sta $2d3e
            sta $379a
            sta $32b9
            sta $2eb9
            sta $3b9a
            sta $3699
            sta $313d
            sta $3736
            lda #113
            sta $3d3b
            lda #115
            sta $38bf
            sta $21bb
            lda #119
            sta $3cbf
            lda #120
            sta $2238
            sta $3b18
            sta $2f36
            sta $2338
            sta $2b36
            sta $293d
            sta $3b99
            sta $3440
            sta $3299
            sta $2f97
            sta $2736
            lda #121
            sta $2b37
            lda #123
            sta $3d3c
            sta $34bf
            lda #124
            sta $22ba
            sta $3f18
            sta $393a
            sta $3397
            lda #126
            sta $393c
            sta $2638
            sta $3d3a
            sta $3e3a
            sta $3797
            lda #127
            sta $2737
            sta $3f35
            sta $21ba
            sta $23b5
            sta $27b5
            rts

.byte   0
.byte   0
.byte   0

.end
