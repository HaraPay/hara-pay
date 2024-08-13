const express = require('express');
const router = express.Router();

class TokenController {
  constructor(tokenService) {
    this.tokenService = tokenService;

    // Bind the methods to ensure `this` context is correct
    this.createToken = this.createToken.bind(this);
    this.transferToken = this.transferToken.bind(this);
  }

  async createToken(req, res) {
    const { name, symbol, decimals, initialSupply, treasuryAccountId } = req.body;
    try {
      const tokenId = await this.tokenService.createToken(name, symbol, decimals, initialSupply, treasuryAccountId);
      res.json({ tokenId: tokenId.toString() });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async transferToken(req, res) {
    const { tokenId, fromAccountId, toAccountId, amount } = req.body;
    try {
      const status = await this.tokenService.transferToken(tokenId, fromAccountId, toAccountId, amount);
      res.json({ status: status.toString() });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = TokenController