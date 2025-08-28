import jwt from 'jsonwebtoken';
const secretKey = process.env.SECRET_KEY_AUTH;

const authenticateToken = (req, res, next) =>{
    const token = req.cookies.token;

    if (!token) {
        return res.status(401).json({ message: 'Access Denied: No token provided' });
    }

    jwt.verify(token, secretKey, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid Token' });
        }
        req.user = user;
        next();
  });
}

export default authenticateToken;

