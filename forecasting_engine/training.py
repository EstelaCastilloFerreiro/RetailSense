"""
Model Training with AutoML
Handles CatBoost and XGBoost training with temporal splits and MAPE-based selection
"""

import pandas as pd
import numpy as np
from typing import Dict, Tuple, List
from catboost import CatBoostRegressor
from xgboost import XGBRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error
from sklearn.model_selection import RandomizedSearchCV
import joblib
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def mean_absolute_percentage_error(y_true, y_pred):
    """
    Calculate MAPE (Mean Absolute Percentage Error)
    
    Args:
        y_true: Actual values
        y_pred: Predicted values
        
    Returns:
        MAPE as percentage
    """
    y_true = np.array(y_true)
    y_pred = np.array(y_pred)
    
    # Avoid division by zero
    mask = y_true != 0
    
    if mask.sum() == 0:
        return 100.0
    
    mape = np.mean(np.abs((y_true[mask] - y_pred[mask]) / y_true[mask])) * 100
    return mape


def create_temporal_split(X: pd.DataFrame, y: pd.Series, 
                         season_year_col: str = 'season_year',
                         test_size: float = 0.2) -> Tuple[pd.DataFrame, pd.DataFrame, pd.Series, pd.Series]:
    """
    Create temporal train/test split (NO random shuffling)
    Last N% of data (by season_year) goes to test set
    
    Args:
        X: Features DataFrame
        y: Target Series
        season_year_col: Column name containing season year
        test_size: Fraction of data for test set
        
    Returns:
        X_train, X_test, y_train, y_test
    """
    logger.info("Creating temporal train/test split")
    
    # Combine X and y temporarily
    df = X.copy()
    df['target'] = y.values
    
    # Sort by season_year
    df = df.sort_values(season_year_col)
    
    # Split temporally
    split_idx = int(len(df) * (1 - test_size))
    
    train_df = df.iloc[:split_idx]
    test_df = df.iloc[split_idx:]
    
    X_train = train_df.drop('target', axis=1)
    y_train = train_df['target']
    X_test = test_df.drop('target', axis=1)
    y_test = test_df['target']
    
    logger.info(f"Train set: {len(X_train)} samples (years {X_train[season_year_col].min()}-{X_train[season_year_col].max()})")
    logger.info(f"Test set: {len(X_test)} samples (years {X_test[season_year_col].min()}-{X_test[season_year_col].max()})")
    
    return X_train, X_test, y_train, y_test


def get_categorical_features(X: pd.DataFrame) -> List[int]:
    """
    Get indices of categorical feature columns
    
    Args:
        X: Features DataFrame
        
    Returns:
        List of column indices for categorical features
    """
    categorical_indices = [i for i, col in enumerate(X.columns) 
                          if X[col].dtype == 'object']
    return categorical_indices


def train_catboost(X_train: pd.DataFrame, y_train: pd.Series,
                   X_test: pd.DataFrame, y_test: pd.Series) -> Dict:
    """
    Train CatBoost model with hyperparameter tuning
    
    Args:
        X_train, y_train: Training data
        X_test, y_test: Validation data
        
    Returns:
        Dict with model and metrics
    """
    logger.info("=== Training CatBoost ===")
    
    # Get categorical feature indices
    cat_features = get_categorical_features(X_train)
    logger.info(f"Categorical features: {len(cat_features)}")
    
    # Hyperparameter grid
    param_grid = {
        'depth': [4, 6, 8],
        'learning_rate': [0.01, 0.05, 0.1],
        'iterations': [100, 200, 300],
        'l2_leaf_reg': [1, 3, 5]
    }
    
    # Base model
    base_model = CatBoostRegressor(
        cat_features=cat_features,
        random_state=42,
        verbose=False
    )
    
    # RandomizedSearchCV
    search = RandomizedSearchCV(
        base_model,
        param_grid,
        n_iter=10,
        cv=3,
        scoring='neg_mean_absolute_error',
        random_state=42,
        n_jobs=-1,
        verbose=1
    )
    
    logger.info("Starting hyperparameter search...")
    search.fit(X_train, y_train)
    
    best_model = search.best_estimator_
    logger.info(f"Best params: {search.best_params_}")
    
    # Predict on test set
    y_pred = best_model.predict(X_test)
    
    # Calculate metrics
    mape = mean_absolute_percentage_error(y_test, y_pred)
    mae = mean_absolute_error(y_test, y_pred)
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    
    logger.info(f"CatBoost - MAPE: {mape:.2f}%, MAE: {mae:.2f}, RMSE: {rmse:.2f}")
    
    return {
        'model': best_model,
        'name': 'CatBoost',
        'mape': mape,
        'mae': mae,
        'rmse': rmse,
        'params': search.best_params_
    }


def train_xgboost(X_train: pd.DataFrame, y_train: pd.Series,
                  X_test: pd.DataFrame, y_test: pd.Series) -> Dict:
    """
    Train XGBoost model with hyperparameter tuning
    
    Args:
        X_train, y_train: Training data
        X_test, y_test: Validation data
        
    Returns:
        Dict with model and metrics
    """
    logger.info("=== Training XGBoost ===")
    
    # Convert categorical features to category type
    X_train_encoded = X_train.copy()
    X_test_encoded = X_test.copy()
    
    for col in X_train.columns:
        if X_train[col].dtype == 'object':
            X_train_encoded[col] = X_train[col].astype('category')
            X_test_encoded[col] = X_test[col].astype('category')
    
    # Hyperparameter grid
    param_grid = {
        'max_depth': [3, 5, 7],
        'learning_rate': [0.01, 0.05, 0.1],
        'n_estimators': [100, 200, 300],
        'reg_alpha': [0, 0.1, 0.5],
        'reg_lambda': [1, 1.5, 2]
    }
    
    # Base model
    base_model = XGBRegressor(
        enable_categorical=True,
        random_state=42,
        n_jobs=-1
    )
    
    # RandomizedSearchCV
    search = RandomizedSearchCV(
        base_model,
        param_grid,
        n_iter=10,
        cv=3,
        scoring='neg_mean_absolute_error',
        random_state=42,
        n_jobs=-1,
        verbose=1
    )
    
    logger.info("Starting hyperparameter search...")
    search.fit(X_train_encoded, y_train)
    
    best_model = search.best_estimator_
    logger.info(f"Best params: {search.best_params_}")
    
    # Predict on test set
    y_pred = best_model.predict(X_test_encoded)
    
    # Calculate metrics
    mape = mean_absolute_percentage_error(y_test, y_pred)
    mae = mean_absolute_error(y_test, y_pred)
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    
    logger.info(f"XGBoost - MAPE: {mape:.2f}%, MAE: {mae:.2f}, RMSE: {rmse:.2f}")
    
    return {
        'model': best_model,
        'name': 'XGBoost',
        'mape': mape,
        'mae': mae,
        'rmse': rmse,
        'params': search.best_params_
    }


def train_models_by_season(X: pd.DataFrame, y: pd.Series, season_type: str) -> Dict:
    """
    Train multiple models and select the best based on MAPE
    
    Args:
        X: Features DataFrame
        y: Target Series
        season_type: 'PV' or 'OI'
        
    Returns:
        Dict with best model and all results
    """
    logger.info(f"\n{'='*60}")
    logger.info(f"TRAINING MODELS FOR SEASON: {season_type}")
    logger.info(f"{'='*60}\n")
    
    # Create temporal split
    X_train, X_test, y_train, y_test = create_temporal_split(X, y)
    
    # Train all models
    results = []
    
    try:
        catboost_result = train_catboost(X_train, y_train, X_test, y_test)
        results.append(catboost_result)
    except Exception as e:
        logger.error(f"CatBoost training failed: {e}")
    
    try:
        xgboost_result = train_xgboost(X_train, y_train, X_test, y_test)
        results.append(xgboost_result)
    except Exception as e:
        logger.error(f"XGBoost training failed: {e}")
    
    if not results:
        raise Exception("All models failed to train")
    
    # Select best model (lowest MAPE)
    best_result = min(results, key=lambda x: x['mape'])
    
    logger.info(f"\n{'='*60}")
    logger.info(f"BEST MODEL: {best_result['name']}")
    logger.info(f"MAPE: {best_result['mape']:.2f}%")
    logger.info(f"MAE: {best_result['mae']:.2f}")
    logger.info(f"RMSE: {best_result['rmse']:.2f}")
    logger.info(f"{'='*60}\n")
    
    return {
        'best_model': best_result['model'],
        'best_model_name': best_result['name'],
        'metrics': {
            'mape': best_result['mape'],
            'mae': best_result['mae'],
            'rmse': best_result['rmse']
        },
        'all_results': results,
        'season_type': season_type
    }


def save_model(model, season_type: str, model_name: str, 
               metrics: Dict = None,
               output_dir: str = 'forecasting_engine/models'):
    """
    Save trained model and its metrics to disk
    
    Args:
        model: Trained model
        season_type: 'PV' or 'OI'
        model_name: Name of the model (CatBoost, XGBoost, etc.)
        metrics: Dict with model metrics (mape, mae, rmse)
        output_dir: Directory to save model
    """
    import json
    import os
    
    os.makedirs(output_dir, exist_ok=True)
    
    # Save model
    model_path = f"{output_dir}/model_{season_type}_{model_name}.pkl"
    joblib.dump(model, model_path)
    logger.info(f"Saved model to {model_path}")
    
    # Save metrics if provided
    if metrics:
        metrics_data = {
            'season_type': season_type,
            'model_name': model_name,
            'metrics': metrics
        }
        metrics_path = f"{output_dir}/metrics_{season_type}.json"
        with open(metrics_path, 'w') as f:
            json.dump(metrics_data, f, indent=2)
        logger.info(f"Saved metrics to {metrics_path}")


def load_model(season_type: str, input_dir: str = 'forecasting_engine/models'):
    """
    Load trained model from disk
    
    Args:
        season_type: 'PV' or 'OI'
        input_dir: Directory containing model
        
    Returns:
        Loaded model
    """
    import os
    import glob
    
    # Find the best model file for this season
    pattern = f"{input_dir}/model_{season_type}_*.pkl"
    files = glob.glob(pattern)
    
    if not files:
        raise FileNotFoundError(f"No model found for season {season_type}")
    
    # Use the first (or most recent) model
    file_path = sorted(files)[-1]
    model = joblib.load(file_path)
    logger.info(f"Loaded model from {file_path}")
    return model


def load_model_metrics(season_type: str, input_dir: str = 'forecasting_engine/models') -> Dict:
    """
    Load saved model metrics from disk
    
    Args:
        season_type: 'PV' or 'OI'
        input_dir: Directory containing metrics file
        
    Returns:
        Dict with model metadata and metrics
    """
    import json
    import os
    
    metrics_path = f"{input_dir}/metrics_{season_type}.json"
    
    if not os.path.exists(metrics_path):
        logger.warning(f"No metrics file found at {metrics_path}")
        return {
            'season_type': season_type,
            'model_name': 'Unknown',
            'metrics': {'mape': None, 'mae': None, 'rmse': None}
        }
    
    with open(metrics_path, 'r') as f:
        data = json.load(f)
    
    logger.info(f"Loaded metrics from {metrics_path}")
    return data
