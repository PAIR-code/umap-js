/*
 *  疑似乱数生成機  移植
 *
 *  Mersenne Twister with improved initialization (2002)
 *  http://www.math.sci.hiroshima-u.ac.jp/~m-mat/MT/mt.html
 *  http://www.math.sci.hiroshima-u.ac.jp/~m-mat/MT/MT2002/mt19937ar.html
 */
// = 移植元ラインセンス =======================================================
// ======================================================================
/* 
   A C-program for MT19937, with initialization improved 2002/2/10.
   Coded by Takuji Nishimura and Makoto Matsumoto.
   This is a faster version by taking Shawn Cokus's optimization,
   Matthe Bellew's simplification, Isaku Wada's real version.
   Before using, initialize the state by using init_genrand(seed) 
   or init_by_array(init_key, key_length).
   Copyright (C) 1997 - 2002, Makoto Matsumoto and Takuji Nishimura,
   All rights reserved.                          
   Redistribution and use in source and binary forms, with or without
   modification, are permitted provided that the following conditions
   are met:
     1. Redistributions of source code must retain the above copyright
        notice, this list of conditions and the following disclaimer.
     2. Redistributions in binary form must reproduce the above copyright
        notice, this list of conditions and the following disclaimer in the
        documentation and/or another materials provided with the distribution.
     3. The names of its contributors may not be used to endorse or promote 
        products derived from this software without specific prior written 
        permission.
   THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
   "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
   LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
   A PARTICULAR PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL THE COPYRIGHT OWNER OR
   CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
   EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
   PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
   PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
   LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
   NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
   SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
   Any feedback is very welcome.
   http://www.math.sci.hiroshima-u.ac.jp/~m-mat/MT/emt.html
   email: m-mat @ math.sci.hiroshima-u.ac.jp (remove space)
*/
// ======================================================================

module.exports = function MersenneTwister() {
  // 整数を扱うクラス
  function Int32(value) {
    var bits = new Array(0, 0, 0, 0);
    var i;
    var v = value;
    if (v != 0) {
      for (i = 0; i < 4; ++i) {
        bits[i] = v & 0xff;
        v = v >> 8;
      }
    }
    this.getValue = function() {
      return (
        (bits[0] | (bits[1] << 8) | (bits[2] << 16)) + (bits[3] << 16) * 0x100
      );
    };
    this.getBits = function(i) {
      return bits[i & 3];
    };
    this.setBits = function(i, val) {
      return (bits[i & 3] = val & 0xff);
    };
    this.add = function(another) {
      var tmp = new Int32(0);
      var i,
        fl = 0,
        b;
      for (i = 0; i < 4; ++i) {
        b = bits[i] + another.getBits(i) + fl;
        tmp.setBits(i, b);
        fl = b >> 8;
      }
      return tmp;
    };
    this.sub = function(another) {
      var tmp = new Int32(0);
      var bb = new Array(0, 0, 0, 0);
      var i;
      for (i = 0; i < 4; ++i) {
        bb[i] = bits[i] - another.getBits(i);
        if (i > 0 && bb[i - 1] < 0) {
          --bb[i];
        }
      }
      for (i = 0; i < 4; ++i) {
        tmp.setBits(i, bb[i]);
      }
      return tmp;
    };
    this.mul = function(another) {
      var tmp = new Int32(0);
      var bb = new Array(0, 0, 0, 0, 0);
      var i, j;
      for (i = 0; i < 4; ++i) {
        for (j = 0; i + j < 4; ++j) {
          bb[i + j] += bits[i] * another.getBits(j);
        }
        tmp.setBits(i, bb[i]);
        bb[i + 1] += bb[i] >> 8;
      }
      return tmp;
    };
    this.and = function(another) {
      var tmp = new Int32(0);
      var i;
      for (i = 0; i < 4; ++i) {
        tmp.setBits(i, bits[i] & another.getBits(i));
      }
      return tmp;
    };
    this.or = function(another) {
      var tmp = new Int32(0);
      var i;
      for (i = 0; i < 4; ++i) {
        tmp.setBits(i, bits[i] | another.getBits(i));
      }
      return tmp;
    };
    this.xor = function(another) {
      var tmp = new Int32(0);
      var i;
      for (i = 0; i < 4; ++i) {
        tmp.setBits(i, bits[i] ^ another.getBits(i));
      }
      return tmp;
    };
    this.rshifta = function(s) {
      var tmp = new Int32(0);
      var bb = new Array(0, 0, 0, 0, 0);
      var p = s >> 3;
      var i,
        sg = 0;
      if ((bits[3] & 0x80) > 0) {
        bb[4] = sg = 0xff;
      }
      for (i = 0; i + p < 4; ++i) {
        bb[i] = bits[i + p];
      }
      for (; i < 4; ++i) {
        bb[i] = sg;
      }
      p = s & 0x7;
      for (i = 0; i < 4; ++i) {
        tmp.setBits(i, ((bb[i] | (bb[i + 1] << 8)) >> p) & 0xff);
      }
      return tmp;
    };
    this.rshiftl = function(s) {
      var tmp = new Int32(0);
      var bb = new Array(0, 0, 0, 0, 0);
      var p = s >> 3;
      var i;
      for (i = 0; i + p < 4; ++i) {
        bb[i] = bits[i + p];
      }
      p = s & 0x7;
      for (i = 0; i < 4; ++i) {
        tmp.setBits(i, ((bb[i] | (bb[i + 1] << 8)) >> p) & 0xff);
      }
      return tmp;
    };
    this.lshift = function(s) {
      var tmp = new Int32(0);
      var bb = new Array(0, 0, 0, 0, 0);
      var p = s >> 3;
      var i;
      for (i = 0; i + p < 4; ++i) {
        bb[i + p + 1] = bits[i];
      }
      p = s & 0x7;
      for (i = 0; i < 4; ++i) {
        tmp.setBits(i, (((bb[i] | (bb[i + 1] << 8)) << p) >> 8) & 0xff);
      }
      return tmp;
    };
    this.equals = function(another) {
      var i;
      for (i = 0; i < 4; ++i) {
        if (bits[i] != another.getBits(i)) {
          return false;
        }
      }
      return true;
    };
    this.compare = function(another) {
      var i;
      for (i = 3; i >= 0; --i) {
        if (bits[i] > another.getBits(i)) {
          return 1;
        } else if (bits[i] < another.getBits(i)) {
          return -1;
        }
      }
      return 0;
    };
  }
  // End of Int32

  /* Period parameters */
  var N = 624;
  var M = 397;
  var MATRIX_A = new Int32(0x9908b0df); /* constant vector a */
  var UMASK = new Int32(0x80000000); /* most significant w-r bits */
  var LMASK = new Int32(0x7fffffff); /* least significant r bits */

  var INT32_ZERO = new Int32(0);
  var INT32_ONE = new Int32(1);

  var MIXBITS = function(u, v) {
    return u.and(UMASK).or(v.and(LMASK));
  };
  var TWIST = function(u, v) {
    return MIXBITS(u, v)
      .rshiftl(1)
      .xor(v.and(INT32_ONE).equals(INT32_ZERO) ? INT32_ZERO : MATRIX_A);
  };

  var state = new Array(); /* the array for the state vector  */
  var left = 1;
  var initf = 0;
  var next = 0;

  var i;
  for (i = 0; i < N; ++i) {
    state[i] = INT32_ZERO;
  }

  /* initializes state[N] with a seed */
  var _init_genrand = function(s) {
    var lt1812433253 = new Int32(1812433253);
    var j;
    state[0] = new Int32(s);
    for (j = 1; j < N; ++j) {
      state[j] = lt1812433253
        .mul(state[j - 1].xor(state[j - 1].rshiftl(30)))
        .add(new Int32(j));
      /* See Knuth TAOCP Vol2. 3rd Ed. P.106 for multiplier. */
      /* In the previous versions, MSBs of the seed affect   */
      /* only MSBs of the array state[].                        */
      /* 2002/01/09 modified by Makoto Matsumoto             */
      //state[j] &= 0xffffffff;  /* for >32 bit machines */
    }
    left = 1;
    initf = 1;
  };
  this.init_genrand = _init_genrand;

  /* initialize by an array with array-length */
  /* init_key is the array for initializing keys */
  /* key_length is its length */
  /* slight change for C++, 2004/2/26 */
  this.init_by_array = function(init_key, key_length) {
    var lt1664525 = new Int32(1664525);
    var lt1566083941 = new Int32(1566083941);
    var i, j, k;
    _init_genrand(19650218);
    i = 1;
    j = 0;
    k = N > key_length ? N : key_length;
    for (; k; --k) {
      state[i] = state[i]
        .xor(state[i - 1].xor(state[i - 1].rshiftl(30)).mul(lt1664525))
        .add(new Int32(init_key[j]))
        .add(new Int32(j)); /* non linear */
      //state[i] &= 0xffffffff; /* for WORDSIZE > 32 machines */
      i++;
      j++;
      if (i >= N) {
        state[0] = state[N - 1];
        i = 1;
      }
      if (j >= key_length) {
        j = 0;
      }
    }
    for (k = N - 1; k; --k) {
      state[i] = state[i]
        .xor(state[i - 1].xor(state[i - 1].rshiftl(30)).mul(lt1566083941))
        .sub(new Int32(i)); /* non linear */
      //state[i] &= 0xffffffff; /* for WORDSIZE > 32 machines */
      i++;
      if (i >= N) {
        state[0] = state[N - 1];
        i = 1;
      }
    }

    state[0] = new Int32(
      0x80000000
    ); /* MSB is 1; assuring non-zero initial array */
    left = 1;
    initf = 1;
  };

  var next_state = function() {
    var p = 0;
    var j;

    /* if init_genrand() has not been called, */
    /* a default initial seed is used         */
    if (initf == 0) {
      _init_genrand(5489);
    }

    left = N;
    next = 0;

    for (j = N - M + 1; --j; ++p) {
      state[p] = state[p + M].xor(TWIST(state[p], state[p + 1]));
    }

    for (j = M; --j; ++p) {
      state[p] = state[p + M - N].xor(TWIST(state[p], state[p + 1]));
    }

    state[p] = state[p + M - N].xor(TWIST(state[p], state[0]));
  };

  var lt0x9d2c5680 = new Int32(0x9d2c5680);
  var lt0xefc60000 = new Int32(0xefc60000);

  /* generates a random number on [0,0xffffffff]-interval */
  var _genrand_int32 = function() {
    var y;

    if (--left == 0) {
      next_state();
    }

    y = state[next];
    ++next;

    /* Tempering */
    y = y.xor(y.rshiftl(11));
    y = y.xor(y.lshift(7).and(lt0x9d2c5680));
    y = y.xor(y.lshift(15).and(lt0xefc60000));
    y = y.xor(y.rshiftl(18));

    return y.getValue();
  };
  this.genrand_int32 = _genrand_int32;

  /* generates a random number on [0,0x7fffffff]-interval */
  this.genrand_int31 = function() {
    var y;

    if (--left == 0) {
      next_state();
    }
    y = state[next];
    ++next;

    /* Tempering */
    y = y.xor(y.rshiftl(11));
    y = y.xor(y.lshift(7).and(lt0x9d2c5680));
    y = y.xor(y.lshift(15).and(lt0xefc60000));
    y = y.xor(y.rshiftl(18));

    return y.rshiftl(1).getValue();
  };

  /* generates a random number on [0,1]-real-interval */
  this.genrand_real1 = function() {
    var y;

    if (--left == 0) {
      next_state();
    }
    y = state[next];
    ++next;

    /* Tempering */
    y = y.xor(y.rshiftl(11));
    y = y.xor(y.lshift(7).and(lt0x9d2c5680));
    y = y.xor(y.lshift(15).and(lt0xefc60000));
    y = y.xor(y.rshiftl(18));

    return y.getValue() * (1.0 / 4294967295.0);
    /* divided by 2^32-1 */
  };

  /* generates a random number on [0,1)-real-interval */
  this.genrand_real2 = function() {
    var y;

    if (--left == 0) {
      next_state();
    }
    y = state[next];
    ++next;

    /* Tempering */
    y = y.xor(y.rshiftl(11));
    y = y.xor(y.lshift(7).and(lt0x9d2c5680));
    y = y.xor(y.lshift(15).and(lt0xefc60000));
    y = y.xor(y.rshiftl(18));

    return y.getValue() * (1.0 / 4294967296.0);
    /* divided by 2^32 */
  };

  /* generates a random number on (0,1)-real-interval */
  this.genrand_real3 = function() {
    var y;

    if (--left == 0) {
      next_state();
    }
    y = state[next];
    ++next;

    /* Tempering */
    y = y.xor(y.rshiftl(11));
    y = y.xor(y.lshift(7).and(lt0x9d2c5680));
    y = y.xor(y.lshift(15).and(lt0xefc60000));
    y = y.xor(y.rshiftl(18));

    return (y.getValue() + 0.5) * (1.0 / 4294967296.0);
    /* divided by 2^32 */
  };

  /* generates a random number on [0,1) with 53-bit resolution*/
  this.genrand_res53 = function() {
    var a = new Int32(_genrand_int32()).rshiftl(5).getValue();
    var b = new Int32(_genrand_int32()).rshiftl(6).getValue();
    return (a * 67108864.0 + b) * (1.0 / 9007199254740992.0);
  };
  /* These real versions are due to Isaku Wada, 2002/01/09 added */
};
