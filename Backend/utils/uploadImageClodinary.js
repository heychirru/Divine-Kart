import ImageKit from 'imagekit';

const imagekit = new ImageKit({
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
});

const uploadImageClodinary = async (image) => {
    const buffer = image?.buffer || Buffer.from(await image.arrayBuffer());
    const fileName = image?.originalname || `product_${Date.now()}`;

    const uploadResult = await imagekit.upload({
        file: buffer,
        fileName: fileName,
        folder: '/divinekart/products',
    });

    return uploadResult;
};

export default uploadImageClodinary;
