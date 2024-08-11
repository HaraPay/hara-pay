const { ussdRouter } = require('ussd-router');
const ussdCallback = async (req, res) => {
    res.set('Content-Type: text/plain');

    if (!req.body.phoneNumber) res.send("END service is failed")

    const { body: { phoneNumber, sessionId, serviceCode, } } = req;

    const { body: { text: rawText } } = req; 
    const text = ussdRouter(rawText);
    const footer = '\n0: Home 00: Back';
    let msg = '';
    
    let senderMSISDN = phoneNumber.substring(1);
    let senderId = await getSenderId(senderMSISDN);
    // console.log('senderId: ', senderId);   
    var data = text.split('*'); 
    let userExists = await checkIfSenderExists(senderId);
    // console.log("Sender Exists? ",userExists);
    if(userExists === false){       
      let userCreated = await createNewUser(senderId, senderMSISDN);     
      console.log('Created user with userID: ', userCreated); 
      // msg += `END Creating your account on HaraPay`;    
    }
  
    let isverified = await checkIfUserisVerified(senderId);    
    if(isverified === false){        
      //  && data[0] !== '7' && data[1] !== '4'
      // console.log("User: ", senderId, "is NOT VERIFIED!");
      // msg += `END Verify your account by dialing *483*354*7*4#`;
      
      if ( data[0] == null || data[0] == ''){ //data[0] !== null && data[0] !== '' && data[1] == null
  
        msg = `CON Welcome to HaraPay. \nKindly Enter your details to verify your account.\n\nEnter new PIN`;
        res.send(msg);
      }else if ( data[0] !== '' && data[1] == null ){ //data[0] !== null && data[0] !== '' && data[1] == null
        newUserPin = data[0];
  
        msg = `CON Reenter PIN to confirm`;
        res.send(msg);
      }else if ( data[0] !== '' && data[1] !== ''  && data[2] == null ) {
        confirmUserPin = data[1];
  
        msg = `CON Enter ID Document Type:\n1. National ID \n2. Passport \n3. AlienID`;
        res.send(msg);
      }else if ( data[0] !== '' && data[1] !== '' && data[2] !== ''  && data[3] == null){ 
        if(data[2]==='1'){documentType = 'ID'}
        else if (data[2]==='2'){documentType = 'Passport'}
        else if (data[2]==='3'){documentType = 'AlienID'}
        else{documentType = 'ID'}
  
        msg = `CON Enter ${documentType} Number`;
        res.send(msg);
      }else if ( data[0] !== '' && data[1] !== '' && data[2] !== ''  && data[3] !== ''  && data[4] == null){ //data[0] !== null && data[0] !== '' && data[1] == null
        documentNumber = data[3];
  
        msg = `CON Enter First Name`;
        res.send(msg);
      }else if ( data[0] !== '' && data[1] !== '' && data[2] !== ''  && data[3] !== ''  && data[4] !== ''  && data[5] == null){ //data[0] !== null && data[0] !== '' && data[1] == null
        firstname = data[4];
        // console.log('Firstname: ', firstname);
  
        msg = `CON Enter Last Name`;
        res.send(msg);
      }else if ( data[0] !== '' && data[1] !== '' && data[2] !== ''  && data[3] !== ''  && data[4] !== ''  && data[5] !== '' && data[6] == null){ //data[0] !== null && data[0] !== '' && data[1] == null
        lastname = data[5];
        // console.log('Lastname: ', lastname);
  
        msg = `CON Enter Date of Birth.\nFormat: YYYY-MM-DD`;
        res.send(msg);
      }else if ( data[0] !== '' && data[1] !== '' && data[2] !== ''  && data[3] !== ''  && data[4] !== '' && data[5] !== '' && data[6] !== '' && data[7] == null){ //data[0] !== null && data[0] !== '' && data[1] == null
        dateofbirth = data[6];
  
        msg = `CON Enter Email Address`;
        res.send(msg);
      }else if ( data[0] !== '' && data[1] !== '' && data[2] !== ''  && data[3] !== ''  && data[4] !== '' && data[5] !== '' && data[6] !== ''  && data[7] !== ''){ //data[0] !== null && data[0] !== '' && data[1] == null
        email = data[7];
        let userMSISDN = phoneNumber.substring(1);
        let userId = await getSenderId(userMSISDN);  
        let enc_loginpin = await createcypher(newUserPin, userMSISDN, iv);
        let isvalidEmail = await validEmail(email);
        console.log(isvalidEmail);
        console.log(`User Details=>${userId} : ${newUserPin} : ${confirmUserPin} : ${documentType} : ${documentNumber} : ${firstname} : ${lastname} : ${dateofbirth} : ${email} : ${enc_loginpin}`);
        
        if(newUserPin === confirmUserPin && newUserPin.length >= 4 ){
          msg = `END Thank You. \nYour Account Details will be verified shortly`;
          res.send(msg);
          try{
            let kycData = {
              "documentType" : documentType,
              "documentNumber" : documentNumber,
              "dateofbirth" : dateofbirth,
              "fullName" : `${firstname} ${lastname}`
            }
  
            //Update User account and enable
            let updateinfo = await verifyNewUser(userId, email, newUserPin, enc_loginpin, firstname, lastname, documentNumber, dateofbirth, userMSISDN);
            await firestore.collection('hashfiles').doc(userId).set({'enc_pin' : `${enc_loginpin}`}); 
  
            let newkycdata = await addUserKycToDB(userId, kycdata);
  
          }catch(e){console.log('KYC Failed: No data received')}
        }
        else if (newUserPin.length < 4 ){
          console.log('KYC Failed')
          msg = `END PIN Must be atleast 4 characters,\n RETRY again`;
          res.send(msg);
          return;
        }
        else if (newUserPin !== confirmUserPin){
          msg = `END Your access PIN does not match,\n RETRY again`; //${newUserPin}: ${confirmUserPin}
          res.send(msg);
          return;
        }
      }
    } else {
      res.send("User isn't verified");
    }
  
  res.send("something gone wrong");

}

const verifyToken = (req, res, next) => {
  // Get auth header value
  const bearerHeader = req.headers['authorization'];
  // Check if bearer is undefined
  if(typeof bearerHeader !== 'undefined') {
    // Split at the space
    const bearer = bearerHeader.split(' ');
    // Get token from array
    const bearerToken = bearer[1];
    // Set the token
    req.token = bearerToken;
    // Next middleware
    next();
  } else {
    // Forbidden
    res.sendStatus(403);
  }
}

const sendcusdApi = async(senderMSISDN, receiverMSISDN, cusdAmount) => {
  senderId = await getSenderId(senderMSISDN)
  // console.log('senderId: ', senderId);
  let isverified = await checkIfUserisVerified(senderId);   
  // console.log('isverified: ', isverified);
  if(isverified === false){
    return {
      "status": 'error',
      "desc": "user account is not verified"
    }   
  }else{
    recipientId = await getRecipientId(receiverMSISDN);
    let recipientstatusresult = await checkIfRecipientExists(recipientId);
    // console.log("Recipient Exists? ",recipientstatusresult);
    if(recipientstatusresult == false){
        // let recipientUserId = await createNewUser(recipientId, receiverMSISDN); 
        // console.log('New Recipient', recipientUserId);
        let message = { 
            "status" : `error`, 
            "desc" : `recipient does not exist`      
        };
        return message;
    }else{  
        // Retrieve User Blockchain Data
        const senderInfo = await getSenderDetails(senderId);
        // console.log('Sender Info: ', JSON.stringify(senderInfo.data()))
        let senderprivkey = await getSenderPrivateKey(senderInfo.data().seedKey, senderMSISDN, iv)

        let receiverInfo = await getReceiverDetails(recipientId);
        while (receiverInfo.data() === undefined || receiverInfo.data() === null || receiverInfo.data() === ''){
            await sleep(1000);
            receiverInfo = await getReceiverDetails(recipientId);
            // console.log('Receiver:', receiverInfo.data());
        }

        let senderName = '';
        await admin.auth().getUser(senderId).then(user => { senderName = user.displayName; return; }).catch(e => {console.log(e)})  
        console.log('Sender fullName: ', senderName);

        let receiverName = '';
        await admin.auth().getUser(recipientId).then(user => { receiverName = user.displayName;  return; }).catch(e => {console.log(e)})  

        console.log('Receiver fullName: ', receiverName);
        let _receiver = '';

        // TODO: Verify User has sufficient balance to send 
        const cusdtoken = await kit.contracts.getStableToken();
        let userbalance = await weiToDecimal(await cusdtoken.balanceOf(senderInfo.data().publicAddress)) // In cUSD
        let _userbalance = number_format(userbalance, 4)
        
        if(userbalance < cusdAmount){
            let message = {
                "status": `failed`,
                "desc": `Not enough funds to fulfill the request`,
            };
            return message;
        }
        else{
            let receipt = await sendcUSD(senderInfo.data().publicAddress, receiverInfo.data().publicAddress, `${cusdAmount}`, senderprivkey);
            if(receipt === 'failed'){
                let message = { 
                    "status" : `error`, 
                    "desc" : `Your transaction has failed due to insufficient balance`      
                };
                return message;
            }else{
                if(receiverName==undefined || receiverName==''){_receiver=receiverMSISDN; } else{ _receiver=receiverName;}
                // let url = await getTxidUrl(receipt.transactionHash);
                // let message2sender = `KES ${amount}  sent to ${_receiver}.\nTransaction URL:  ${url}`;
                // let message2receiver = `You have received KES ${amount} from ${senderName}.\nTransaction Link:  ${url}`;
                // console.log('tx URL', url);
                // msg = `END KES ${amount} sent to ${_receiver}. \nTransaction Details: ${url}`;  
                // res.send(msg);
                let message = { 
                    "status" : `success`, 
                    "desc" : `${cusdAmount} CUSD  sent to ${_receiver}`,
                    "txid" :  receipt.transactionHash     
                };
                return message;
            }
        }
    }
  }
}

async function validateCeloTransaction(txhash){    
  var receipt = await kit.web3.eth.getTransactionReceipt(txhash)
  // .then(console.log);
  return receipt;
}

async function processApiWithdraw(withdrawMSISDN, amount, txhash){
    // let withdrawMSISDN = phoneNumber.substring(1); 
    console.log('Amount to Withdraw: KES.', amount);
    amount = await number_format(amount, 0);
    console.log('Rounded Amount to Withdraw: KES.', amount);
    let displayName = '';
    withdrawId = await getSenderId(withdrawMSISDN);
    // console.log('withdrawId: ', withdrawId);    
    await admin.auth().getUser(withdrawId).then(user => { displayName = user.displayName; return; }).catch(e => {console.log(e)}) 
    console.log('Withdrawer fullName: ', displayName);

    let currencyCode = 'KES';
    let countryCode = 'KE';
    let recipientName = `${displayName}`;
    let mobileNumber = '';
    try {
      const number = phoneUtil.parseAndKeepRawInput(`${withdrawMSISDN}`, 'KE');
      mobileNumber = '0'+number.getNationalNumber();
    } catch (error) { console.log(error); }
    console.log('Withdrawer MobileNumber', mobileNumber);
    let referenceCode = await jenga.generateReferenceCode();
    console.log(`Ref Code: ${referenceCode}`);
    let withdrawToMpesa = await jenga.sendFromJengaToMobileMoney(amount, referenceCode, currencyCode, countryCode, recipientName, mobileNumber);
    console.log('Sending From Jenga to Mpesa Status => ', JSON.stringify(withdrawToMpesa.status));

    let url = await getTxidUrl(txhash);
    let message2receiver = `You have Withdrawn KES ${amount} to your Mpesa account.\nRef Code: ${referenceCode}\nTransaction URL:  ${url}`;

    // jenga.sendFromJengaToMobileMoney(data[1], 'KES', 'KE',`${fullname}`, withdrawMSISDN) 
    // let message2receiver = `You have Withdrawn KES ${number_format(amount,2)} to your Mpesa account.`;
    sendMessage("+"+withdrawMSISDN, message2receiver);  

    let message = {
      "status": `success`,
      "recipientName": displayName,
      "message": `Withdraw via Harapay successful`,
      "recipient": `${withdrawMSISDN}`,
      "amount": `${amount} KES`,
      "referenceCode" : `${referenceCode}`
    };
    return message    
}

async function checkisUserKyced(userId){
  let docRef = firestore.collection('kycdb').doc(userId);
  let isKyced = false;
  
  let doc = await docRef.get();
  if (!doc.exists) {
    isKyced = false;  // Run KYC
    console.log('No such document!');
  } else {
    isKyced = true; // do nothing
    console.log('KYC Document Exists => ', JSON.stringify(doc.data()));
  }
  return isKyced;
}

async function getProcessedTransaction(txhash){
  let docRef = firestore.collection('processedtxns').doc(txhash);
  let processed = false;
  
  let doc = await docRef.get();
  if (!doc.exists) {
    processed = false;  // create the document
    console.log('No such document!');
  } else {
    processed = true; // do nothing
    console.log('Document data:', JSON.stringify(doc.data()));
  }
  return processed;
}

async function setProcessedTransaction(txhash, txdetails){
  try {
    let db = firestore.collection('processedtxns').doc(txhash);
    db.set(txdetails).then(newDoc => {console.log("Transaction processed: => ", newDoc.id)})
    
  } catch (err) { console.log(err) }
}

async function logJengaProcessedTransaction(txid, txdetails){
  try {
    let db = firestore.collection('jengaWithdrawTxns').doc(txid);
    db.set(txdetails).then(newDoc => {console.log("Jenga Transaction processed")})
    
  } catch (err) { console.log(err) }
}

async function logJengaFailedTransaction(txid, txdetails){
  try {
    let db = firestore.collection('jengaFailedWithdraws').doc(txid);
    db.set(txdetails).then(newDoc => {console.log("Jenga Failed Transaction logged: => ", newDoc.id)})
    
  } catch (err) { console.log(err) }
}

async function checkIfUserAccountExist(userId, userMSISDN){
  let userExists = await checkIfSenderExists(userId);
  if(userExists === false){         
    let userCreated = await createNewUser(userId, userMSISDN);     
    console.log('Created user with userID: ', userCreated); 
  }
}

async function checkIsUserVerified(senderId){
  let isverified = await checkIfUserisVerified(senderId);    
  if(isverified === false){ 
    res.json({
      "status": 'unverified',
      "message": "user account is not verified",
      "comment" : "Access"
    })    
  }    
}


//USSD APP
async function getAccDetails(userMSISDN){
  // console.log(userMSISDN);
  let userId = await getSenderId(userMSISDN);
  
  let userInfo = await getSenderDetails(userId);
  console.log('User Address => ', userInfo.data().publicAddress);
  let url = await getAddressUrl(`${userInfo.data().publicAddress}`)
  console.log('Address: ',url);            
  return `CON Your Account Number is: ${userMSISDN} \nAccount Address is: ${url}`;
}

async function getSenderPrivateKey(seedCypher, senderMSISDN, iv){
  try {
    let senderSeed = await decryptcypher(seedCypher, senderMSISDN, iv);
    let senderprivkey =  `${await generatePrivKey(senderSeed)}`;
    return new Promise(resolve => {  
      resolve (senderprivkey)        
    }); 
  }catch(err){console.log('Unable to decrypt cypher')}
}

async function getSeedKey(userMSISDN){
  let userId = await getSenderId(userMSISDN);
  console.log('User Id: ', userId)
  
  let userInfo = await getSenderDetails(userId);
  // console.log('SeedKey => ', userInfo.data().seedKey);
  let decr_seed = await decryptcypher(userInfo.data().seedKey, userMSISDN, iv)
          
  return `END Your Backup Phrase is:\n ${decr_seed}`;
}

async function addUserKycToDB(userId, kycdata){ 
  try {
    let db = firestore.collection('kycdb').doc(userId);
    let newDoc = await db.set(kycdata)
    console.log("KYC Document Created: ")
    // .then(newDoc => { console.log("KYC Document Created:\n", newDoc.id)})
    let userInfo = await getReceiverDetails(userId);
    // let publicAddress = userInfo.data().publicAddress
    let initdepohash = await signupDeposit(userInfo.data().publicAddress);
    console.log('Signup Deposit', JSON.stringify(initdepohash));    
  } catch (e) { console.log(e) }
}

  
async function addUserDataToDB(userId, userMSISDN){ 
  try {    
    let mnemonic = await bip39.generateMnemonic(256);
    var enc_seed = await createcypher(mnemonic, userMSISDN, iv);
    let publicAddress = await getPublicAddress(mnemonic);
    console.log('Public Address: ', publicAddress);

    const newAccount = {
        'seedKey' : `${enc_seed}`,
        'publicAddress' : `${publicAddress}`
    };

    let db = firestore.collection('accounts').doc(userId);    
    db.set(newAccount).then(newDoc => { console.log("Document Created: ", newDoc.id) })
    
  } catch (err) { console.log('accounts db error: ',err) }
}

async function signupDeposit(publicAddress){
  const escrowMSISDN = functions.config().env.escrow.msisdn;
  let escrowId = await getSenderId(escrowMSISDN);
  let escrowInfo = await getSenderDetails(escrowId);
  let escrowPrivkey = await getSenderPrivateKey(escrowInfo.data().seedKey, escrowMSISDN, iv);

  let receipt = await sendcUSD(escrowInfo.data().publicAddress, publicAddress, '0.01', escrowPrivkey);  
  // let celohash = await sendcGold(escrowInfo.data().publicAddress, publicAddress, '0.001', escrowPrivkey);
  console.log(`Signup deposit tx hash: ${receipt.transactionHash}`);
  return receipt.transactionHash;
}       
  
async function getSenderDetails(senderId){
  let db = firestore.collection('accounts').doc(senderId);
  let result = await db.get();
  return result;    
}


async function getLoginPin(userId){
  let db = firestore.collection('hashfiles').doc(userId);
  let result = await db.get();
  return result.data().enc_pin;    
}
    
async function getReceiverDetails(recipientId){    
  let db = firestore.collection('accounts').doc(recipientId);
  let result = await db.get();
  return result;
}

function number_format(val, decimals){
  //Parse the value as a float value
  val = parseFloat(val);
  //Format the value w/ the specified number
  //of decimal places and return it.
  return val.toFixed(decimals);
}

async function getWithdrawerBalance(publicAddress){
  const cusdtoken = await kit.contracts.getStableToken();
  const cusdbalance = await cusdtoken.balanceOf(publicAddress); // In cUSD 
  //cUSDBalance = kit.web3.utils.fromWei(cUSDBalance.toString(), 'ether'); 
  let _cusdbalance = await weiToDecimal(cusdbalance);
  // console.info(`Account balance of ${_cusdbalance} CUSD`);
  _cusdbalance = number_format(_cusdbalance, 4)
  return _cusdbalance;
}

async function getAccBalance(userMSISDN){
  // console.log(userMSISDN);
  let userId  = await getSenderId(userMSISDN);
  // console.log('UserId: ', userId);
  let userInfo = await getSenderDetails(userId);
  //console.log('User Address => ', userInfo.data().publicAddress);
  const cusdtoken = await kit.contracts.getStableToken();
  const cusdbalance = await cusdtoken.balanceOf(userInfo.data().publicAddress); // In cUSD 
  //cUSDBalance = kit.web3.utils.fromWei(cUSDBalance.toString(), 'ether'); 
  let _cusdbalance = await weiToDecimal(cusdbalance);
  console.info(`Account balance of ${_cusdbalance} CUSD`);
  _cusdbalance = number_format(_cusdbalance, 4);
  const celotoken = await kit.contracts.getGoldToken();
  let celobalance = await celotoken.balanceOf(userInfo.data().publicAddress); // In cGLD
  let _celobalance = await weiToDecimal(celobalance);
  //cGoldBalance = kit.web3.utils.fromWei(celoBalance.toString(), 'ether');    
  console.info(`Account balance of ${_celobalance} CELO`);
  return `CON Your Account Balance is:\n Kenya Shillings: ${_cusdbalance*usdMarketRate} \n0:Home 00:Back`;
}

function getSenderId(senderMSISDN){
  return new Promise(resolve => {
    let senderId = crypto.createHash(phone_hash_fn).update(senderMSISDN).digest('hex');
    resolve(senderId);
  });
} 
  
function getRecipientId(receiverMSISDN){
  return new Promise(resolve => {
      let recipientId = crypto.createHash(phone_hash_fn).update(receiverMSISDN).digest('hex');
      resolve(recipientId);
  });
} 

async function checkIfSenderExists(senderId){      
  return await checkIfUserExists(senderId);
}

async function checkIfRecipientExists(recipientId){    
  return await checkIfUserExists(recipientId);
}

async function checkIfUserisVerified(userId){
  var isVerified;         
  return new Promise(resolve => {
    admin.auth().getUser(userId)
      .then(function(userRecord) {          
          if (userRecord.customClaims['verifieduser'] === true) {
              // console.log(userRecord.customClaims['verifieduser']);
              isVerified = true;
              resolve (isVerified);
          } else {
            // console.log("User: ", userId, "is NOT VERIFIED!:\n");
            isVerified = false;
            resolve (isVerified);
          }
      })
      .catch(function(error) {
          // console.log('Error fetching user data:', userId, "does not EXIST:\n");
          isVerified = false;
          resolve (isVerified);
      });
  });    
}

// Validates email address of course.
function validEmail(e) {
  var filter = /^\s*[\w\-\+_]+(\.[\w\-\+_]+)*\@[\w\-\+_]+\.[\w\-\+_]+(\.[\w\-\+_]+)*\s*$/;
  return String(e).search (filter) != -1;
}

async function checkIfUserExists(userId){
  var exists;         
  return new Promise(resolve => {
    admin.auth().getUser(userId)
      .then(function(userRecord) {          
        if (userRecord) {
            // console.log('Successfully fetched user data:', userRecord.uid);
            exists = true;
            resolve (exists);
        } else {
          // console.log("Document", userId, "does not exists:\n");
          exists = false;
          resolve (exists);
        }
      })
      .catch(function(error) {
          console.log('Error fetching user data:', userId, "does not exists:\n");
          exists = false;
          resolve (exists);
      });
  });    
} 

function sleep(ms){
  return Promise(resolve => setTimeout(resolve, ms));
}

function createNewUser(userId, userMSISDN){
  return new Promise(resolve => {
      admin.auth().createUser({
          uid: userId,
          phoneNumber: `+${userMSISDN}`,
          disabled: true
      })
      .then(userRecord => {
        admin.auth().setCustomUserClaims(userRecord.uid, {verifieduser: false})
        console.log('Successfully created new user:', userRecord.uid);
        resolve (userRecord.uid);
      })
      .catch(function(error) {
          console.log('Error creating new user:', error);
      });
  });  
}

async function verifyNewUser(userId, email, newUserPin, password, firstname, lastname, idnumber, dateofbirth, userMSISDN){
  return new Promise(resolve => {
      admin.auth().updateUser(userId, { 
          email: `${email}`,
          password: `${password}`,
          emailVerified: false,
          displayName: `${firstname} ${lastname}`,
          idnumber: `${idnumber}`,
          dateofbirth: `${dateofbirth}`,
          disabled: false
      })
      .then(userRecord => {
        admin.auth().setCustomUserClaims(userRecord.uid, {verifieduser: true})
        //Inform user that account is now verified
        let message2sender = `Welcome to Harapay.\nYour account details have been verified.\nDial *483*354# to access the HaraPay Ecosytem.\nUser PIN: ${newUserPin}`;
        sendMessage("+"+userMSISDN, message2sender);
        resolve (userRecord.uid);
      })
      .catch(function(error) {
          console.log('Error updating user:', error);
      });
  });  
}


module.exports = { ussdCallback }