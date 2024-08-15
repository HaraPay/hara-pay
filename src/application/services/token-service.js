const { Client, TokenCreateTransaction, TransferTransaction, TokenType, PrivateKey } = require("@hashgraph/sdk");

class TokenService {
  constructor(accountId, privateKey) {
    // Create a PrivateKey object from the string
    this.operatorPrivateKey = PrivateKey.fromString(privateKey);

    // Set the Client operator
    this.client = Client.forTestnet()
      .setOperator(accountId, this.operatorPrivateKey);
  }

  async createToken(name, symbol, decimals, initialSupply, treasuryAccountId) {
    const transaction = new TokenCreateTransaction()
      .setTokenName(name)
      .setTokenSymbol(symbol)
      .setDecimals(decimals)
      .setInitialSupply(initialSupply)
      .setTreasuryAccountId(treasuryAccountId)
      .setTokenType(TokenType.FungibleCommon)
      .freezeWith(this.client);

    const signTx = await transaction.sign(this.operatorPrivateKey);
    const submitTx = await signTx.execute(this.client);
    const receipt = await submitTx.getReceipt(this.client);
    return receipt.tokenId;
  }

  async transferToken(tokenId, fromAccountId, toAccountId, amount) {
    const transaction = new TransferTransaction()
      .addTokenTransfer(tokenId, fromAccountId, -amount)
      .addTokenTransfer(tokenId, toAccountId, amount)
      .freezeWith(this.client);

    const signTx = await transaction.sign(this.operatorPrivateKey);
    const submitTx = await signTx.execute(this.client);
    const receipt = await submitTx.getReceipt(this.client);
    return receipt.status;
  }
}

module.exports = TokenService;
