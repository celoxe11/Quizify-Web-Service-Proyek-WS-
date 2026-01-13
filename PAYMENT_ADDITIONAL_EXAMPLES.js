// ============================================
// File: src/controllers/paymentController.js - ADDITIONAL EXAMPLES
// ============================================

/**
 * OPTIONAL: Helper function untuk mendapatkan subscription details
 * Bisa digunakan untuk menampilkan info subscription ke frontend
 */
const getSubscriptionDetails = async (req, res) => {
  try {
    const userId = req.user.id || req.user.uid;

    const user = await User.findOne({
      where: { id: userId },
      include: [
        {
          model: Subscription,
          as: 'subscription',
          attributes: ['id_subs', 'status', 'price'],
        },
      ],
    });

    if (!user) {
      return res.status(404).json({ message: 'User tidak ditemukan' });
    }

    return res.status(200).json({
      message: 'Subscription details berhasil diambil',
      data: {
        user_id: user.id,
        current_subscription: user.subscription || { status: 'Free' },
        upgraded_at: user.updated_at,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * OPTIONAL: Get all available subscription packages
 * Untuk menampilkan di halaman upgrade subscription
 */
const getSubscriptionPackages = async (req, res) => {
  try {
    const packages = await Subscription.findAll({
      order: [['price', 'ASC']],
    });

    const formatted = packages.map((pkg) => ({
      id: pkg.id_subs,
      name: pkg.status,
      price: parseFloat(pkg.price),
      features: getPackageFeatures(pkg.status),
    }));

    return res.status(200).json({
      message: 'Subscription packages berhasil diambil',
      data: formatted,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Helper: Define features per package
 */
const getPackageFeatures = (packageName) => {
  const features = {
    Free: ['5 quizzes per day', 'Basic analytics'],
    Premium: [
      'Unlimited quizzes',
      'Advanced analytics',
      'Custom quizzes',
      'Priority support',
    ],
  };

  return features[packageName] || [];
};

/**
 * OPTIONAL: Check if user is premium
 * Bisa digunakan sebagai middleware untuk protect premium features
 */
const isPremium = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const user = await User.findOne({
      where: { id: userId },
      attributes: ['subscription_id'],
    });

    if (!user) {
      return res.status(404).json({ message: 'User tidak ditemukan' });
    }

    // Assume subscription_id > 1 adalah premium
    // Adjust sesuai database Anda
    if (user.subscription_id > 1) {
      next();
    } else {
      return res.status(403).json({
        message: 'Feature ini hanya untuk premium members',
        redirect: '/upgrade',
      });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ============================================
// FILE: Example usage di routes
// ============================================

// Di paymentRoutes.js, tambahkan:
/*
router.get(
  '/subscription/details',
  authenticate,
  getSubscriptionDetails
);

router.get(
  '/subscription/packages',
  authenticate,
  getSubscriptionPackages
);
*/

// ============================================
// FILE: Example middleware usage
// ============================================

// Protect premium endpoints:
/*
router.get(
  '/premium-feature',
  authenticate,
  isPremium,
  premiumFeatureController
);
*/

// ============================================
// FILE: Example Flutter integration
// ============================================

/*
// lib/presentation/pages/upgrade_page.dart

class UpgradePage extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Upgrade to Premium')),
      body: FutureBuilder<List<Package>>(
        future: paymentRepo.getSubscriptionPackages(),
        builder: (context, snapshot) {
          if (!snapshot.hasData) return Center(child: CircularProgressIndicator());

          return ListView.builder(
            itemCount: snapshot.data!.length,
            itemBuilder: (context, index) {
              final package = snapshot.data![index];
              return PackageCard(
                name: package.name,
                price: package.price,
                features: package.features,
                onUpgrade: () {
                  context.read<PaymentBloc>().add(
                    CreatePaymentEvent(subscriptionId: package.id),
                  );
                },
              );
            },
          );
        },
      ),
    );
  }
}
*/

// ============================================
// DATABASE SCRIPT: Setup demo data
// ============================================

/*
-- Insert subscription packages
INSERT INTO subscription (status, price) VALUES 
  ('Free', 0),
  ('Premium', 50000),
  ('Enterprise', 100000);

-- Update existing user to Free subscription
UPDATE user SET subscription_id = 1 WHERE id = 'ST001';
*/
