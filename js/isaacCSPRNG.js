/**
 * ISAAC CSPRNG implementation for JavaScript
 * Based on the paper "ISAAC: A Fast Cryptographic Random Number Generator" by Jean-Philippe Aumasson
 */

class IsaacCSPRNG {
  constructor(seed) {
    this.count = 0;
    this.a = 0;
    this.b = 0;
    this.c = 0;
    this.mem = new Array(256).fill(0);
    this.rsl = new Array(256).fill(0);
    
    // Initialize with seed
    this.initWithSeed(seed);
  }
  
  // Mix the seed into the state
  initWithSeed(seed) {
    // Convert seed string to an array of integers
    const seedData = [];
    for (let i = 0; i < seed.length; i++) {
      seedData.push(seed.charCodeAt(i));
    }
    
    // Pad to 256 values if needed
    while (seedData.length < 256) {
      seedData.push(0);
    }
    
    // Initialize state
    for (let i = 0; i < 256; i++) {
      this.mem[i] = seedData[i % seedData.length];
    }
    
    // Run the algorithm a few times to mix things up
    for (let i = 0; i < 4; i++) {
      this.isaac();
    }
  }
  
  // The core ISAAC algorithm
  isaac() {
    let x, y;
    this.c++;
    this.b += this.c;
    
    for (let i = 0; i < 256; i++) {
      x = this.mem[i];
      switch (i & 3) {
        case 0: this.a ^= this.a << 13; break;
        case 1: this.a ^= this.a >>> 6; break;
        case 2: this.a ^= this.a << 2; break;
        case 3: this.a ^= this.a >>> 16; break;
      }
      
      this.a = this.mem[(i + 128) & 0xFF] + this.a;
      y = this.mem[(x >>> 2) & 0xFF] + this.a + this.b;
      this.mem[i] = y;
      this.b = this.mem[(y >>> 10) & 0xFF] + x;
      this.rsl[i] = this.b;
    }
    
    // Reset the counter
    this.count = 0;
  }
  
  // Get a random number between 0 and 1
  random() {
    if (this.count === 256) {
      this.isaac();
    }
    
    // Convert to a float between 0 and 1
    return (this.rsl[this.count++] >>> 0) / 4294967296;
  }
  
  // Get a random integer between min and max (inclusive)
  randomInt(min, max) {
    return Math.floor(this.random() * (max - min + 1)) + min;
  }
}

// Make it available globally
if (typeof window !== 'undefined') {
  window.IsaacCSPRNG = IsaacCSPRNG;
}