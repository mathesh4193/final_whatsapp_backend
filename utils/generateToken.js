const jwt=require('jsonwebtoken');

const generateToken=(user)=>{
    return jwt.sign({id:user._id.toString()}, process.env.JWT_SECRET, {expiresIn:'1y'});
}

module.exports=generateToken;   