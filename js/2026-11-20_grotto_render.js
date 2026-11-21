/* 2026-11-20 v20k canvas renderer. Layout mirrors the PIL v20k script (S=2 then down to 1080x1350). */
(function (root) {
  "use strict";
  var W = 1080, H = 1350, S = 2;
  function H2(h) { h = h.replace("#", ""); return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)]; }
  function css(rgb) { return "rgb(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + ")"; }
  function mix(a, b, t) { return [0,1,2].map(function (i) { return Math.round(a[i] * (1 - t) + b[i] * t); }); }
  function sc(v) { return Math.round(v * S); }

  var INK = [28,28,34], WHITE = [255,255,255], GREY = [112,112,122];
  var BG = [236,204,212], CTA = [194,24,91], TAB = [233,70,110];
  var LINE = [232,176,192], CHIP_BG = [253,226,233], CHIP_INK = [194,24,91];
  var GRID_MUTE = [210,198,202];
  var COLOR_MAP = {
    "빨강": {fill:"#E11D48", ink:"#FFFFFF", deep:"#BE123C", ring:"#7F1D1D"},
    "주황": {fill:"#EA580C", ink:"#FFFFFF", deep:"#C2410C", ring:"#9A3412"},
    "노랑": {fill:"#FFD60A", ink:"#1C1C22", deep:"#A16207", ring:"#1C1C22"},
    "베이지": {fill:"#D9B38C", ink:"#1C1C22", deep:"#8A5A2B", ring:"#4B3320"},
    "초록": {fill:"#16A34A", ink:"#FFFFFF", deep:"#15803D", ring:"#14532D"},
    "청색": {fill:"#2563EB", ink:"#FFFFFF", deep:"#1D4ED8", ring:"#1E3A8A"},
    "흰색": {fill:"#E2E8F0", ink:"#1C1C22", deep:"#475569", ring:"#1C1C22"},
    "은색": {fill:"#A7B0BE", ink:"#1C1C22", deep:"#4B5563", ring:"#1C1C22"},
    "검정": {fill:"#111827", ink:"#F9FAFB", deep:"#111827", ring:"#6B7280"},
    "남색": {fill:"#1E3A8A", ink:"#FFFFFF", deep:"#1E3A8A", ring:"#0F1F4D"}
  };
  var PILLS = { GOOD: ["#15803D","#FFFFFF"], BAD: ["#C81E3C","#FFFFFF"], MISSION: ["#FFD60A","#1C1C22"] };
  var LIGHT_LUCKY = { "노랑":1, "흰색":1, "베이지":1, "은색":1 };

  var _assets = null;
  function loadImage(src) {
    return new Promise(function (resolve, reject) {
      var im = new Image();
      im.onload = function () { resolve(im); };
      im.onerror = function () { reject(new Error("asset failed: " + src)); };
      im.src = src;
    });
  }
  function loadFonts(base) {
    var faces = [
      new FontFace("GAEx", "url(" + base + "/fonts/GothicA1-ExtraBold.ttf)", { weight: "800", style: "normal" }),
      new FontFace("PretendardCard", "url(" + base + "/fonts/Pretendard-SemiBold.otf)", { weight: "600", style: "normal" }),
      new FontFace("PretendardCard", "url(" + base + "/fonts/Pretendard-Bold.otf)", { weight: "700", style: "normal" }),
      new FontFace("NotoGanzhi", "url(" + base + "/fonts/NotoSansCJK-Bold-ganzhi.otf)", { weight: "700", style: "normal" })
    ];
    return Promise.all(faces.map(function (f) { return f.load().then(function (ff) { document.fonts.add(ff); return ff; }); }));
  }
  function loadAssets(base) {
    base = (base == null || base === "") ? "" : String(base).replace(/\/$/, "");
    if (_assets && _assets.base === base) return Promise.resolve(_assets);
    return Promise.all([
      loadFonts(base),
      loadImage(base + "/img/2026-11-20_grotto_qr@2x.png"),
      loadImage(base + "/img/grok_bot_mark_cream.png")
    ]).then(function (res) {
      _assets = { base: base, qr: res[1], mark: res[2] };
      return _assets;
    });
  }

  function recolorMark(src, body, eye, size, outline) {
    var c = document.createElement("canvas");
    c.width = src.naturalWidth || src.width;
    c.height = src.naturalHeight || src.height;
    var ctx = c.getContext("2d");
    ctx.drawImage(src, 0, 0);
    var img = ctx.getImageData(0, 0, c.width, c.height);
    var d = img.data;
    var i, r, g, b, a, lum;
    for (i = 0; i < d.length; i += 4) {
      a = d[i+3];
      if (a <= 8) continue;
      r = d[i]; g = d[i+1]; b = d[i+2];
      lum = 0.299 * r + 0.587 * g + 0.114 * b;
      if (lum < 80) {
        if (!eye) { d[i+3] = 0; continue; }
        d[i] = eye[0]; d[i+1] = eye[1]; d[i+2] = eye[2];
      } else {
        d[i] = body[0]; d[i+1] = body[1]; d[i+2] = body[2];
      }
    }
    ctx.putImageData(img, 0, 0);
    var out = document.createElement("canvas");
    out.width = size; out.height = size;
    var o = out.getContext("2d");
    o.imageSmoothingEnabled = true;
    o.imageSmoothingQuality = "high";
    if (outline) {
      // dilate alpha for a thin dark ring
      var m = document.createElement("canvas");
      m.width = size; m.height = size;
      var mx = m.getContext("2d");
      mx.drawImage(c, 0, 0, size, size);
      mx.globalCompositeOperation = "source-in";
      mx.fillStyle = css(outline);
      mx.fillRect(0, 0, size, size);
      o.drawImage(m, -2, 0);
      o.drawImage(m, 2, 0);
      o.drawImage(m, 0, -2);
      o.drawImage(m, 0, 2);
      o.drawImage(m, -1, -1);
      o.drawImage(m, 1, -1);
      o.drawImage(m, -1, 1);
      o.drawImage(m, 1, 1);
    }
    o.drawImage(c, 0, 0, size, size);
    return out;
  }

  function fontGA(px) { return (px * S) + 'px "GAEx", "NotoGanzhi", sans-serif'; }
  function fontPB(px) { return "700 " + (px * S) + 'px "PretendardCard", "NotoGanzhi", sans-serif'; }
  function fontPSB(px) { return "600 " + (px * S) + 'px "PretendardCard", "NotoGanzhi", sans-serif'; }
  function fontNoto(px) { return "700 " + (px * S) + 'px "NotoGanzhi", "GAEx", sans-serif'; }

  function textWidth(ctx, s, font) {
    ctx.font = font;
    return ctx.measureText(s).width / S;
  }
  function fillLA(ctx, s, x, y, font, color) {
    ctx.font = font;
    ctx.fillStyle = css(color);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    var m = ctx.measureText(s);
    var asc = (m.fontBoundingBoxAscent != null) ? m.fontBoundingBoxAscent : (m.actualBoundingBoxAscent || 0);
    ctx.fillText(s, sc(x), sc(y) + asc);
  }
  function fillMM(ctx, s, x, y, font, color) {
    ctx.font = font;
    ctx.fillStyle = css(color);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(s, sc(x), sc(y));
  }
  function rrect(ctx, x0, y0, x1, y1, r, fill, stroke, sw) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(sc(x0), sc(y0), sc(x1-x0), sc(y1-y0), sc(r));
    else {
      var X0=sc(x0),Y0=sc(y0),X1=sc(x1),Y1=sc(y1),R=sc(r);
      ctx.moveTo(X0+R,Y0); ctx.arcTo(X1,Y0,X1,Y1,R); ctx.arcTo(X1,Y1,X0,Y1,R); ctx.arcTo(X0,Y1,X0,Y0,R); ctx.arcTo(X0,Y0,X1,Y0,R); ctx.closePath();
    }
    if (fill) { ctx.fillStyle = css(fill); ctx.fill(); }
    if (stroke) { ctx.strokeStyle = css(stroke); ctx.lineWidth = sc(sw || 2); ctx.stroke(); }
  }
  function ellipse(ctx, x0, y0, x1, y1, fill, stroke, sw) {
    var cx = (sc(x0)+sc(x1))/2, cy=(sc(y0)+sc(y1))/2;
    var rx = Math.abs(sc(x1)-sc(x0))/2, ry=Math.abs(sc(y1)-sc(y0))/2;
    ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI*2);
    if (fill) { ctx.fillStyle = css(fill); ctx.fill(); }
    if (stroke) { ctx.strokeStyle = css(stroke); ctx.lineWidth = sc(sw || 2); ctx.stroke(); }
  }

  function greedyWrap(ctx, words, font, width) {
    var out = [], cur = "";
    words.forEach(function (w) {
      var t = (cur ? cur + " " + w : w);
      if (textWidth(ctx, t, font) <= width) cur = t;
      else { if (cur) out.push(cur); cur = w; }
    });
    if (cur) out.push(cur);
    return out;
  }
  function wrap(ctx, s, font, width) {
    var words = s.split(" ");
    var best = greedyWrap(ctx, words, font, width);
    if (best.length > 1 && best[best.length-1].indexOf(" ") < 0) {
      for (var i = words.length - 2; i >= 0; i--) {
        if (words[i].charAt(words[i].length-1) !== ",") continue;
        var head = words.slice(0, i+1).join(" ");
        if (textWidth(ctx, head, font) > width) continue;
        var rest = greedyWrap(ctx, words.slice(i+1), font, width);
        if (rest.length + 1 <= best.length && rest[rest.length-1].indexOf(" ") >= 0 && rest.length === 1) {
          return [head].concat(rest);
        }
      }
    }
    return best;
  }

  function drawCard(ctx, card, assets) {
    var first = card.colors[0];
    var A = {};
    var src = COLOR_MAP[first];
    Object.keys(src).forEach(function (k) { A[k] = H2(src[k]); });
    var L = 84, R = 996;
    var x0 = 36, x1 = 1044, y0 = 40, y1 = 1306;
    var lum = 0.299*A.fill[0] + 0.587*A.fill[1] + 0.114*A.fill[2];
    var WASH = mix(A.fill, WHITE, 0.84);
    var WRING = lum < 100 ? mix(A.fill, WHITE, 0.45) : mix(A.fill, A.deep, 0.5);

    // studio background
    ctx.fillStyle = css(BG);
    ctx.fillRect(0, 0, W*S, H*S);
    var g = ctx.createRadialGradient(sc(540), sc(400), sc(20), sc(540), sc(400), sc(900));
    g.addColorStop(0, "rgb(250,232,236)");
    g.addColorStop(1, css(BG));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W*S, H*S);

    function slipPath(c) {
      c.beginPath();
      var r = 17, pitch = 48;
      var n_ = Math.floor((x1 - x0) / pitch);
      var off = (x1 - x0 - n_ * pitch) / 2 + pitch / 2;
      c.moveTo(sc(x0), sc(y1));
      c.lineTo(sc(x0), sc(y0));
      var i, cx;
      for (i = 0; i < n_; i++) {
        cx = x0 + off + i * pitch;
        // scallop: go along top, dip in a semicircle
        if (i === 0) c.lineTo(sc(cx - r), sc(y0));
        c.arc(sc(cx), sc(y0), sc(r), Math.PI, 0, true); // inward (clockwise from left, cutting into the slip)
      }
      c.lineTo(sc(x1), sc(y0));
      c.lineTo(sc(x1), sc(y1));
      c.closePath();
    }

    // shadows
    ctx.save();
    ctx.fillStyle = "rgba(110,64,80,0.50)";
    ctx.filter = "blur(" + (14*S) + "px)";
    ctx.translate(sc(14), sc(20));
    slipPath(ctx); ctx.fill();
    ctx.filter = "none";
    ctx.restore();
    ctx.save();
    ctx.translate(sc(14), sc(16));
    ctx.fillStyle = "rgb(196,154,164)";
    slipPath(ctx); ctx.fill();
    ctx.restore();

    ctx.fillStyle = "#fff";
    slipPath(ctx); ctx.fill();
    ctx.save();
    slipPath(ctx); ctx.clip();

    function dashed(y, notch) {
      var x = x0 + 28;
      ctx.strokeStyle = css(LINE);
      ctx.lineWidth = sc(3);
      ctx.lineCap = "butt";
      while (x < x1 - 28) {
        ctx.beginPath();
        ctx.moveTo(sc(x), sc(y));
        ctx.lineTo(sc(x + 14), sc(y));
        ctx.stroke();
        x += 24;
      }
      if (notch !== false) {
        ellipse(ctx, x0-14, y-14, x0+14, y+14, BG, null);
        ellipse(ctx, x1-14, y-14, x1+14, y+14, BG, null);
      }
    }

    // title
    fillLA(ctx, "오늘의 그롯또", L, 82, fontGA(78), INK);

    // date + pillar
    var fD = fontPB(42), DY = 188;
    fillLA(ctx, card.date, L, DY, fD, INK);
    var dx = L + textWidth(ctx, card.date, fD) + 16;
    var chipF = fontNoto(38);
    var cw = textWidth(ctx, card.pillar, chipF) + 28;
    rrect(ctx, dx, DY, dx+cw, DY+54, 12, CHIP_BG, null);
    fillMM(ctx, card.pillar, dx + cw/2, DY+27, chipF, CHIP_INK);

    // QR
    var qside = 185, qx = R + 8 - qside, qy = 78;
    ctx.fillStyle = "#fff";
    ctx.fillRect(sc(qx), sc(qy), sc(qside), sc(qside));
    ctx.drawImage(assets.qr, sc(qx), sc(qy), sc(qside), sc(qside));

    // lucky-color mark left of QR
    var ms = Math.round(qside * 0.72);
    var gapQr = 16;
    var mx = qx - gapQr - ms;
    var my = qy + (qside - ms) / 2;
    var body = A.fill, eye = A.ink, ol = LIGHT_LUCKY[first] ? A.ring : null;
    var sideMk = recolorMark(assets.mark, body, eye, sc(ms), ol);
    ctx.drawImage(sideMk, sc(mx), sc(my));

    dashed(268);

    // headline
    var acc = card.accent;
    var maxw = R - L;
    var rawLines = [];
    (card.headline_raw || []).forEach(function (raw) {
      if (raw) rawLines.push(raw);
    });
    function segsOf(raw) {
      if (acc && raw.indexOf(acc) >= 0) {
        var i = raw.indexOf(acc), segs = [];
        if (i) segs.push([raw.slice(0, i), INK]);
        segs.push([acc, A.deep]);
        if (i + acc.length < raw.length) segs.push([raw.slice(i + acc.length), INK]);
        return segs;
      }
      return [[raw, INK]];
    }
    function wrapKeep(s, font, keep) {
      var best = wrap(ctx, s, font, maxw);
      if (!keep || s.indexOf(keep) < 0) return best;
      if (best.some(function (ln) { return ln.indexOf(keep) >= 0; })) return best;
      if (textWidth(ctx, keep, font) > maxw) return best;
      var i = s.indexOf(keep);
      var before = s.slice(0, i).replace(/ $/, "");
      var out = before ? wrap(ctx, before, font, maxw) : [];
      var rest = keep + s.slice(i + keep.length);
      return out.concat(wrap(ctx, rest, font, maxw));
    }
    function wrapRawLines(font, budget) {
      var out = [], i, parts, restBudget;
      for (i = 0; i < rawLines.length; i++) {
        restBudget = budget - out.length - (rawLines.length - i - 1);
        if (restBudget < 1) restBudget = 1;
        parts = wrapKeep(rawLines[i], font, acc);
        if (!parts.length) continue;
        if (parts.some(function (p) { return textWidth(ctx, p, font) > maxw; })) return null;
        if (parts.length > restBudget) return null;
        Array.prototype.push.apply(out, parts);
      }
      return out;
    }
    var hs = 70, hf, lines, wrapped, tooWide;
    while (true) {
      hf = fontGA(hs);
      tooWide = rawLines.some(function (raw) { return textWidth(ctx, raw, hf) > maxw; });
      if (!tooWide || hs <= 50) break;
      hs -= 1;
    }
    if (tooWide) {
      while (true) {
        hf = fontGA(hs);
        wrapped = wrapRawLines(hf, 3);
        if (wrapped || hs <= 36) break;
        hs -= 1;
      }
      if (!wrapped) wrapped = wrapRawLines(fontGA(36), 3) || rawLines;
      lines = wrapped.map(segsOf);
      hs = wrapped === rawLines ? 36 : hs;
      hf = fontGA(hs);
    } else {
      lines = rawLines.map(segsOf);
    }
    var LH = Math.floor(hs * 1.24), HY = 280, accBox = null;
    lines.forEach(function (ln, k) {
      var x = L, y = HY + k * LH;
      ln.forEach(function (pair) {
        var t = pair[0], c = pair[1];
        if (t === acc && c === A.deep) accBox = { x: x, y: y, w: textWidth(ctx, t, hf), hs: hs };
        fillLA(ctx, t, x, y, hf, c);
        x += textWidth(ctx, t, hf);
      });
    });
    if (accBox) {
      var ay = accBox.y + accBox.hs + 2;
      rrect(ctx, accBox.x, ay, accBox.x + accBox.w, ay + 11, 5, A.fill, (A.ring[0]===0x1C && A.ring[1]===0x1C && A.ring[2]===0x22) || (A.fill[0]+A.fill[1]+A.fill[2] > 600) ? A.deep : null, 1.5);
    }
    var headBottom = HY + lines.length * LH;
    var bf = fontPSB(38), BL = 48, PW = 190;
    var pillItems = ["GOOD", "BAD", "MISSION"].map(function (lab) {
      var s = lab === "GOOD" ? card.good : lab === "BAD" ? card.bad : card.mission;
      return { lab: lab, ls: wrap(ctx, s, bf, R - L - PW - 28) };
    });
    function pillBlock(pg) {
      var h = 0;
      pillItems.forEach(function (it) { h += Math.max(it.ls.length * BL, 56) + pg; });
      return h;
    }
    var capGap = 22, capBall = 76, D = 96, ballGrid = 18, cellG = Math.min(40, Math.floor((R - L) * 0.60 / 9));
    ctx.font = fontGA(40);
    var footM = ctx.measureText("갓생봇.com");
    var footDesc = ((footM.fontBoundingBoxDescent != null) ? footM.fontBoundingBoxDescent : (footM.actualBoundingBoxDescent || 0)) / S;
    var gh0 = 5 * cellG, gridPad = 16, pillPad = 16, pillGap = 14, ctaPad = 16, CH0 = 70, footPad = 16, footExt = 17 + footDesc + 2;
    function layoutBottom(cg, cb, bg, gp, pp, pg, cp, fp) {
      return headBottom + cg + cb + D + bg + gh0 + gp + pp + pillBlock(pg) + cp + CH0 + fp + footExt;
    }
    var deficit = Math.ceil(layoutBottom(capGap, capBall, ballGrid, gridPad, pillPad, pillGap, ctaPad, footPad) - y1);
    if (deficit > 0) {
      function take(cur, min, mul) {
        mul = mul || 1;
        var step = Math.min(cur - min, Math.ceil(deficit / mul));
        if (step < 1) return cur;
        deficit -= step * mul;
        return cur - step;
      }
      capBall = take(capBall, 58);
      pillGap = take(pillGap, 8, 3);
      capGap = take(capGap, 16);
      ballGrid = take(ballGrid, 10);
      gridPad = take(gridPad, 10);
      pillPad = take(pillPad, 8);
      ctaPad = take(ctaPad, 8);
      footPad = take(footPad, 8);
    }
    dashed(headBottom + capGap);

    // caption + balls
    var capY = headBottom + capGap;
    var cf = fontPSB(36);
    var cap = "재미로 보는 행운 번호예요";
    fillLA(ctx, cap, R - textWidth(ctx, cap, cf), capY + 8, cf, GREY);
    var by = capY + capBall;
    var bp = (R - L - D) / 5;
    var luckyC = null, k, n, cx, cy;
    for (k = 0; k < card.six.length; k++) {
      n = card.six[k];
      cx = L + D/2 + k * bp; cy = by + D/2;
      if (n === card.lucky) {
        ellipse(ctx, cx-D/2-9, cy-D/2-9, cx+D/2+9, cy+D/2+9, null, A.ring, 3);
        ellipse(ctx, cx-D/2, cy-D/2, cx+D/2, cy+D/2, A.fill, A.ring, 2);
        fillMM(ctx, String(n), cx, cy+2, fontPB(68), A.ink);
        luckyC = [cx, cy];
      } else {
        ellipse(ctx, cx-D/2, cy-D/2, cx+D/2, cy+D/2, WASH, WRING, 4);
        fillMM(ctx, String(n), cx, cy+2, fontPB(68), INK);
      }
    }

    // stamp
    var stOutline, stText;
    if (LIGHT_LUCKY[first]) { stOutline = A.deep; stText = A.ink; }
    else { stOutline = A.fill; stText = A.fill; }
    var SW = 160, SH = 66;
    var stamp = document.createElement("canvas");
    stamp.width = sc(SW); stamp.height = sc(SH);
    var sd = stamp.getContext("2d");
    // local rrect in stamp pixel space: draw in 2x already via sc
    function srr(x0,y0,x1,y1,r) {
      sd.beginPath();
      if (sd.roundRect) sd.roundRect(sc(x0), sc(y0), sc(x1-x0), sc(y1-y0), sc(r));
      else {
        var X0=sc(x0),Y0=sc(y0),X1=sc(x1),Y1=sc(y1),R=sc(r);
        sd.moveTo(X0+R,Y0); sd.arcTo(X1,Y0,X1,Y1,R); sd.arcTo(X1,Y1,X0,Y1,R); sd.arcTo(X0,Y1,X0,Y0,R); sd.arcTo(X0,Y0,X1,Y0,R); sd.closePath();
      }
    }
    srr(4,6,152,58,10);
    sd.fillStyle = "#fff"; sd.fill();
    sd.strokeStyle = css(stOutline); sd.lineWidth = sc(4); sd.stroke();
    sd.font = fontPB(34);
    sd.fillStyle = css(stText);
    sd.textAlign = "center"; sd.textBaseline = "middle";
    sd.fillText("행운 " + card.lucky, sc(78), sc(32));
    var stx = luckyC[0] - 92, sty = by - 50;
    ctx.save();
    // rotate -4 deg around stamp center after placing
    var sw2 = stamp.width, sh2 = stamp.height;
    ctx.translate(sc(stx) + sw2/2, sc(sty) + sh2/2);
    ctx.rotate(-4 * Math.PI / 180);
    ctx.drawImage(stamp, -sw2/2, -sh2/2);
    ctx.restore();

    // 1-45 grid
    var gy = by + D + ballGrid, colsG = 9, rowsG = 5;
    var cell = cellG;
    var mk = {};
    card.six.forEach(function (nn) { mk[nn] = 1; });
    for (n = 1; n <= 45; n++) {
      var rc = n - 1, r_ = Math.floor(rc / colsG), c_ = rc % colsG;
      cx = L + c_ * cell + cell/2;
      cy = gy + r_ * cell + cell/2;
      var rad = cell/2 - 3;
      if (n === card.lucky) {
        ellipse(ctx, cx-rad, cy-rad, cx+rad, cy+rad, A.fill, A.ring, 2);
        fillMM(ctx, String(n), cx, cy+1, fontPB(Math.floor(cell*0.62)), A.ink);
      } else if (mk[n]) {
        ellipse(ctx, cx-rad, cy-rad, cx+rad, cy+rad, CHIP_BG, TAB, 3);
        fillMM(ctx, String(n), cx, cy+1, fontPB(Math.floor(cell*0.62)), INK);
      } else {
        fillMM(ctx, String(n), cx, cy+1, fontPSB(Math.floor(cell*0.55)), GRID_MUTE);
      }
    }
    var gh = rowsG * cell;
    var ix = L + colsG * cell + 28, ly = gy + 8;
    fillLA(ctx, "행운의 색", ix, ly, fontPB(36), GREY);
    var chs = 52, chy = ly + 44, chx = ix;
    rrect(ctx, chx, chy, chx+chs, chy+chs, 12, A.fill, A.ring, 3);
    fillLA(ctx, card.colors.join(", "), chx + chs + 16, chy + 8, fontPB(40), INK);
    dashed(gy + gh + gridPad);

    // pills
    var y = gy + gh + gridPad + pillPad;
    pillItems.forEach(function (it) {
      var lab = it.lab, ls = it.ls;
      var pf = H2(PILLS[lab][0]), pt = H2(PILLS[lab][1]);
      rrect(ctx, L, y+1, L+PW, y+53, 26, pf, null);
      fillMM(ctx, lab, L + PW/2, y+28, fontPB(32), pt);
      ls.forEach(function (ln, ki) { fillLA(ctx, ln, L+PW+28, y + ki*BL, bf, INK); });
      y += Math.max(ls.length * BL, 56) + pillGap;
    });

    // full-width CTA
    var cy0 = y + ctaPad, CH = CH0;
    rrect(ctx, L, cy0, R, cy0+CH, CH/2, CTA, null);
    fillMM(ctx, "내 생일로 오늘 운세 뽑아보기", (L+R)/2, cy0+CH/2+1, fontPB(38), WHITE);
    var fy = cy0 + CH + footPad;
    fillMM(ctx, "갓생봇.com", W/2, fy+17, fontGA(40), INK);

    ctx.restore(); // end clip
  }

  function renderCard(card, opts) {
    opts = opts || {};
    var base = opts.assetBase != null ? opts.assetBase : "";
    return loadAssets(base).then(function (assets) {
      var hi = document.createElement("canvas");
      hi.width = W * S; hi.height = H * S;
      var ctx = hi.getContext("2d");
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      drawCard(ctx, card, assets);
      var out = document.createElement("canvas");
      out.width = W; out.height = H;
      var o = out.getContext("2d");
      o.imageSmoothingEnabled = true;
      o.imageSmoothingQuality = "high";
      o.drawImage(hi, 0, 0, W, H);
      return new Promise(function (resolve) {
        out.toBlob(function (blob) { resolve({ canvas: out, blob: blob, width: W, height: H }); }, "image/png");
      });
    });
  }

  var API = { loadAssets: loadAssets, renderCard: renderCard, COLOR_MAP: COLOR_MAP, PILLS: PILLS };
  if (typeof module !== "undefined" && module.exports) module.exports = API;
  root.GSGrotto = root.GSGrotto || {};
  Object.keys(API).forEach(function (k) { root.GSGrotto[k] = API[k]; });
})(typeof globalThis !== "undefined" ? globalThis : this);
