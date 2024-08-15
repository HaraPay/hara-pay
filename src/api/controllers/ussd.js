const {
    ussdRouter,
    getSenderId,
    checkIfSenderExists,
    createNewUser,
    checkIfUserisVerified,
    createcypher,
    validEmail,
    verifyNewUser,
    firestore,
    addUserKycToDB
} = require('hara-pay.application/services/ussd-service')
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
      res.send("END Congrats! User is verified");
    }
}

module.exports = { ussdCallback }